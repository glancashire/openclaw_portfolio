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
        proposals.push({ proposal, instrument, estimatedChf });
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
  const allocationAfterPct = totalValueChf > 0 ? Number(((executableChf / totalValueChf) * 100).toFixed(2)) : Number(merged.allocationBeforePct || 0);
  const driftAfter = Number((allocationAfterPct - targetPct).toFixed(2));
  const driftCorrected = Number((Math.abs(merged.driftBefore || 0) - Math.abs(driftAfter)).toFixed(2));

  return {
    ...merged,
    instrument: instrument.tickerOrIsin,
    instrumentName: instrument.name,
    currency: sizing.currency || instrument.currency,
    estimatedChf,
    estimatedOrderChf: executableChf,
    quantity: sizing.quantity,
    limitPrice: sizing.limitPrice,
    allocationTargetPct: targetPct,
    allocationAfterPct,
    driftAfter,
    driftCorrected,
    blocked: merged.blocked || (!isCashSleeve && sizing.quantity <= 0),
    action: isCashSleeve ? 'hold' : merged.action,
    status: isCashSleeve ? 'planned' : merged.status,
    rationale: isCashSleeve
      ? 'Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order.'
      : `Deploy available cash toward underweight ${merged.assetClass} using ${instrument.name}.`,
    riskNote: isCashSleeve
      ? 'Planning entry only; no broker order required for the cash sleeve.'
      : `Dry-run instrument proposal only; ${sizing.sizingNote}`,
    priceSource: sizing.priceSource,
    ibkrConid: instrument.ibkrConid || null,
    fxToChf: sizing.fxToChf || instrument.fxToChfHint || null,
  };
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

  return {
    ...assetClassProposals,
    proposals,
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

  return {
    ...assetClassProposals,
    proposals,
  };
}

module.exports = { proposeInstrumentTrades, proposeInstrumentTradesLivePriced, buildInstrumentProposal, proposalDistribution };
