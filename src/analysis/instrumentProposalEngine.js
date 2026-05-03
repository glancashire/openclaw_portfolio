const { proposeTrades } = require('./tradeProposalEngine');
const { readApprovedInstruments } = require('./approvedInstruments');
const { estimateOrderSize } = require('./draftPricing');
const { estimateOrderSizeWithBrokerFallback } = require('./brokerBackedPricing');

function proposalDistribution(assetClassProposals, instruments) {
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

    const weighted = eligible.filter((instrument) => instrument.target != null);
    const totalTarget = weighted.reduce((sum, instrument) => sum + instrument.target, 0);

    if (weighted.length && totalTarget > 0) {
      for (const instrument of weighted) {
        const share = instrument.target / totalTarget;
        const estimatedChf = Number((proposal.estimatedChf * share).toFixed(2));
        proposals.push({ proposal, instrument, estimatedChf, share });
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
  const distributed = proposalDistribution(assetClassProposals, instruments);

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
    return buildInstrumentProposal(proposal, instrument, estimatedChf, sizing);
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
  const distributed = proposalDistribution(assetClassProposals, instruments);
  const proposals = [];

  for (const { proposal, instrument, estimatedChf } of distributed) {
    const sizing = await estimateOrderSizeWithBrokerFallback({ instrument, estimatedChf, portfolio });
    proposals.push(buildInstrumentProposal(proposal, instrument, estimatedChf, sizing));
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
