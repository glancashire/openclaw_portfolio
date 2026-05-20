const fs = require('fs');
const { proposeTrades } = require('./tradeProposalEngine');
const { readApprovedInstruments } = require('./approvedInstruments');
const { estimateOrderSize } = require('./draftPricing');
const { estimateOrderSizeWithBrokerFallback } = require('./brokerBackedPricing');


function parseNumber(value) {
  const cleaned = String(value || '').replace(/[,% ]/g, '').trim();
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function extractSectionRows(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return [];
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).filter((line) => line.startsWith('|')).slice(2)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

function loadCurrentInstrumentAllocations(holdingsPath, instruments) {
  const text = fs.readFileSync(holdingsPath, 'utf8');
  const rows = extractSectionRows(text, 'Current Holdings');
  const totalMatch = text.match(/- Total value CHF:\s*(.+)/);
  const totalValueChf = totalMatch ? parseNumber(totalMatch[1]) : 0;
  const byInstrument = new Map();
  const instrumentByConid = new Map();
  const instrumentBySymbol = new Map();
  const instrumentByName = new Map();

  for (const instrument of instruments) {
    if (instrument.ibkrConid) instrumentByConid.set(String(instrument.ibkrConid).trim(), instrument);
    if (instrument.ibkrSymbol) instrumentBySymbol.set(String(instrument.ibkrSymbol).trim().toUpperCase(), instrument);
    if (instrument.name) instrumentByName.set(String(instrument.name).trim().toUpperCase(), instrument);
    byInstrument.set(instrument.tickerOrIsin, 0);
  }

  for (const row of rows) {
    const tickerOrIsin = row[0] || '';
    const name = String(row[1] || '').trim().toUpperCase();
    const valueChf = parseNumber(row[7]);
    const matched = instrumentByConid.get(String(tickerOrIsin).trim())
      || instrumentBySymbol.get(String(tickerOrIsin).trim().toUpperCase())
      || instrumentByName.get(name)
      || instruments.find((instrument) => String(instrument.tickerOrIsin || '').trim().toUpperCase() === String(tickerOrIsin).trim().toUpperCase());
    if (!matched) continue;
    byInstrument.set(matched.tickerOrIsin, (byInstrument.get(matched.tickerOrIsin) || 0) + valueChf);
  }

  const allocationByInstrument = new Map();
  for (const [tickerOrIsin, valueChf] of byInstrument.entries()) {
    allocationByInstrument.set(tickerOrIsin, totalValueChf > 0 ? Number(((valueChf / totalValueChf) * 100).toFixed(2)) : 0);
  }
  return { totalValueChf, allocationByInstrument };
}

function proposalDistribution(assetClassProposals, instruments, allocationByInstrument = new Map()) {
  const proposals = [];

  for (const proposal of assetClassProposals.proposals) {
    const eligible = instruments.filter((instrument) => instrument.assetClass === proposal.assetClass);
    if (!eligible.length) {
      proposals.push({
        ...proposal,
        instrument: null,
        blocked: true,
        rationale: `${proposal.rationale} No approved instrument mapped to asset class ${proposal.assetClass}.`,
      });
      continue;
    }

    const withCurrent = eligible.map((instrument) => {
      const current = Number(allocationByInstrument.get(instrument.tickerOrIsin) || 0);
      const target = Number(instrument.target || 0);
      return { instrument, current, target, gap: Number((target - current).toFixed(2)) };
    });

    const underweight = withCurrent.filter((row) => row.gap > 0.01 && row.instrument.tickerOrIsin !== 'CASH-CHF');
    const weighted = (underweight.length ? underweight : withCurrent.filter((row) => row.instrument.target != null)).filter((row) => row.instrument.target != null);
    const totalGap = underweight.reduce((sum, row) => sum + row.gap, 0);
    const totalTarget = weighted.reduce((sum, row) => sum + Number(row.instrument.target || 0), 0);

    if (underweight.length && totalGap > 0) {
      for (const row of underweight) {
        const share = row.gap / totalGap;
        const estimatedChf = Number((proposal.estimatedChf * share).toFixed(2));
        proposals.push({ proposal, instrument: row.instrument, estimatedChf, share });
      }
    } else if (weighted.length && totalTarget > 0) {
      for (const row of weighted) {
        const share = Number(row.instrument.target || 0) / totalTarget;
        const estimatedChf = Number((proposal.estimatedChf * share).toFixed(2));
        proposals.push({ proposal, instrument: row.instrument, estimatedChf, share });
      }
    } else {
      const share = 1 / eligible.length;
      for (const instrument of eligible) {
        const estimatedChf = Number((proposal.estimatedChf * share).toFixed(2));
        proposals.push({
          proposal: {
            ...proposal,
            rationale: `${proposal.rationale} Split equally across approved instruments for ${proposal.assetClass}.`,
          },
          instrument,
          estimatedChf,
          share,
        });
      }
    }
  }

  return proposals;
}

function buildInstrumentProposal(baseProposal, instrument, estimatedChf, sizing, extra = {}) {
  const isCashSleeve = instrument.tickerOrIsin === 'CASH-CHF';

  const merged = {
    ...baseProposal,
    ...extra,
  };
  const totalValueChf = Number(merged.totalValueChf || 0);
  const targetPct = Number(instrument.target || merged.allocationTargetPct || 0);
  const executableChf = Number(sizing.estimatedOrderChf || 0);
  const allocationBeforePct = Number(merged.allocationBeforePct || 0);
  const incrementalAllocationPct = totalValueChf > 0 ? Number(((executableChf / totalValueChf) * 100).toFixed(2)) : 0;
  const allocationAfterPct = Number((allocationBeforePct + incrementalAllocationPct).toFixed(2));
  const driftAfter = Number((allocationAfterPct - targetPct).toFixed(2));
  const driftCorrected = Number((Math.abs(merged.driftBefore || 0) - Math.abs(driftAfter)).toFixed(2));
  const residualCashChf = Number(((estimatedChf || 0) - executableChf).toFixed(2));
  const minTradeSizeChf = Number(merged.minTradeSize || 0);
  const belowMin = !isCashSleeve && executableChf > 0 && minTradeSizeChf > 0 && executableChf < minTradeSizeChf;
  const quantityBlocked = !isCashSleeve && Number(sizing.quantity || 0) <= 0;
  const blocked = Boolean(merged.blocked || belowMin || quantityBlocked);

  const rationaleParts = [];
  if (isCashSleeve) {
    rationaleParts.push('Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order.');
  } else {
    rationaleParts.push(`Deploy available cash toward underweight ${merged.assetClass} using ${instrument.name}.`);
    if (residualCashChf > 0) rationaleParts.push(`Whole-share sizing leaves CHF ${residualCashChf.toFixed(2)} unallocated for this leg.`);
  }

  const riskParts = [];
  if (isCashSleeve) {
    riskParts.push('Planning entry only; no broker order required for the cash sleeve.');
  } else {
    riskParts.push(`Dry-run instrument proposal only; ${sizing.sizingNote}`);
    if (belowMin) riskParts.push(`Executable size CHF ${executableChf.toFixed(2)} is below the configured minimum trade size of CHF ${minTradeSizeChf.toFixed(2)}.`);
    if (residualCashChf > 0) riskParts.push(`Residual CHF ${residualCashChf.toFixed(2)} remains due to whole-share constraints.`);
  }

  return {
    ...merged,
    instrument: instrument.tickerOrIsin,
    instrumentName: instrument.name,
    currency: sizing.currency || instrument.currency,
    estimatedChf,
    estimatedOrderChf: executableChf,
    residualCashChf,
    quantity: sizing.quantity,
    limitPrice: sizing.limitPrice,
    allocationTargetPct: targetPct,
    allocationBeforePct,
    allocationAfterPct,
    driftAfter,
    driftCorrected,
    blocked,
    action: isCashSleeve ? 'hold' : merged.action,
    status: isCashSleeve ? 'planned' : merged.status,
    rationale: rationaleParts.join(' '),
    riskNote: riskParts.join(' '),
    priceSource: sizing.priceSource,
    ibkrConid: instrument.ibkrConid || null,
    fxToChf: sizing.fxToChf || instrument.fxToChfHint || null,
  };
}

function summariseInstrumentProposals(proposals) {
  const residualCashChf = Number(proposals.reduce((sum, proposal) => sum + Number(proposal.residualCashChf || 0), 0).toFixed(2));
  const blockedCount = proposals.filter((proposal) => proposal.blocked).length;
  const belowMinCount = proposals.filter((proposal) => Number(proposal.estimatedOrderChf || 0) > 0 && Number(proposal.minTradeSize || 0) > 0 && Number(proposal.estimatedOrderChf || 0) < Number(proposal.minTradeSize || 0)).length;
  const notes = [];
  if (residualCashChf > 0) notes.push(`Whole-share sizing leaves CHF ${residualCashChf.toFixed(2)} residual cash across the current proposal set.`);
  if (belowMinCount > 0) notes.push(`${belowMinCount} instrument proposal(s) remain below the configured minimum trade size.`);
  if (blockedCount > 0) notes.push(`${blockedCount} instrument proposal(s) are blocked and should not be treated as execution-ready.`);
  return { residualCashChf, blockedCount, belowMinCount, notes };
}

function proposeInstrumentTrades({ portfolioPath, holdingsPath }) {
  const assetClassProposals = proposeTrades({ portfolioPath, holdingsPath });
  const instruments = readApprovedInstruments(portfolioPath);
  const { allocationByInstrument } = loadCurrentInstrumentAllocations(holdingsPath, instruments);
  const distributed = proposalDistribution(assetClassProposals, instruments, allocationByInstrument);

  const proposals = distributed.map(({ proposal, instrument, estimatedChf }) => {
    const isCashSleeve = instrument.tickerOrIsin === 'CASH-CHF';
    const sizing = isCashSleeve ? {
      quantity: 0,
      limitPrice: 0,
      estimatedOrderChf: estimatedChf,
      sizingNote: 'Cash sleeve retained directly in CHF.',
      priceSource: 'cash_balance',
      currency: 'CHF',
      fxToChf: 1,
    } : estimateOrderSize({ tickerOrIsin: instrument.tickerOrIsin, estimatedChf });
    return buildInstrumentProposal(proposal, instrument, estimatedChf, sizing, { allocationBeforePct: allocationByInstrument.get(instrument.tickerOrIsin) || 0 });
  });

  const summary = summariseInstrumentProposals(proposals);
  return {
    ...assetClassProposals,
    proposals,
    residualCashChf: summary.residualCashChf,
    proposalWarnings: summary.notes,
    notes: [...(assetClassProposals.notes || []), ...summary.notes],
  };
}

async function proposeInstrumentTradesLivePriced({ portfolioPath, holdingsPath, portfolio = 'etf' }) {
  const assetClassProposals = proposeTrades({ portfolioPath, holdingsPath });
  const instruments = readApprovedInstruments(portfolioPath);
  const { allocationByInstrument } = loadCurrentInstrumentAllocations(holdingsPath, instruments);
  const distributed = proposalDistribution(assetClassProposals, instruments, allocationByInstrument);
  const proposals = [];

  for (const { proposal, instrument, estimatedChf } of distributed) {
    const sizing = await estimateOrderSizeWithBrokerFallback({ instrument, estimatedChf, portfolio });
    proposals.push(buildInstrumentProposal(proposal, instrument, estimatedChf, sizing, { allocationBeforePct: allocationByInstrument.get(instrument.tickerOrIsin) || 0 }));
  }

  const summary = summariseInstrumentProposals(proposals);
  return {
    ...assetClassProposals,
    proposals,
    residualCashChf: summary.residualCashChf,
    proposalWarnings: summary.notes,
    notes: [...(assetClassProposals.notes || []), ...summary.notes],
  };
}

module.exports = { proposeInstrumentTrades, proposeInstrumentTradesLivePriced, buildInstrumentProposal, proposalDistribution, summariseInstrumentProposals };
