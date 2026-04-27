const { proposeTrades } = require('./tradeProposalEngine');
const { readApprovedInstruments } = require('./approvedInstruments');

function proposeInstrumentTrades({ portfolioPath, holdingsPath }) {
  const assetClassProposals = proposeTrades({ portfolioPath, holdingsPath });
  const instruments = readApprovedInstruments(portfolioPath);

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
        proposals.push({
          ...proposal,
          instrument: instrument.tickerOrIsin,
          instrumentName: instrument.name,
          currency: instrument.currency,
          estimatedChf,
          blocked: proposal.blocked,
        });
      }
    } else {
      const share = 1 / eligible.length;
      for (const instrument of eligible) {
        const estimatedChf = Number((proposal.estimatedChf * share).toFixed(2));
        proposals.push({
          ...proposal,
          instrument: instrument.tickerOrIsin,
          instrumentName: instrument.name,
          currency: instrument.currency,
          estimatedChf,
          blocked: proposal.blocked,
          rationale: `${proposal.rationale} Split equally across approved instruments for ${proposal.assetClass}.`,
        });
      }
    }
  }

  return {
    ...assetClassProposals,
    proposals,
  };
}

module.exports = { proposeInstrumentTrades };
