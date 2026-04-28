const { latestTradeProposals } = require('../reporting/portfolioData');
const { readApprovedInstruments } = require('./approvedInstruments');

function buildExecutionPlan({ portfolioPath, tradesPath, totalValue }) {
  const approved = readApprovedInstruments(portfolioPath);
  const proposals = latestTradeProposals(tradesPath);
  const approvedById = new Map(approved.map((instrument) => [instrument.tickerOrIsin, instrument]));

  const rows = proposals.map((proposal) => {
    const instrument = approvedById.get(proposal.tickerOrIsin);
    const targetPct = Number(instrument?.target || 0);
    const intendedChf = Number(proposal.estimatedChf || 0);
    const executableChf = Number(proposal.estimatedChf || proposal.amount || 0);
    const intendedPct = totalValue > 0 ? Number(((intendedChf / totalValue) * 100).toFixed(2)) : 0;
    const executablePct = totalValue > 0 ? Number(((executableChf / totalValue) * 100).toFixed(2)) : 0;
    const executionGapChf = Number((intendedChf - executableChf).toFixed(2));

    return {
      tickerOrIsin: proposal.tickerOrIsin,
      name: proposal.instrument,
      action: proposal.action,
      status: proposal.status,
      quantity: Number(proposal.quantity || 0),
      limitPrice: Number(proposal.limitPrice || 0),
      targetPct,
      intendedChf,
      intendedPct,
      executableChf,
      executablePct,
      executionGapChf,
      approval: proposal.approval,
      reason: proposal.reason,
    };
  });

  const totals = rows.reduce((acc, row) => {
    acc.intendedChf += row.intendedChf;
    acc.executableChf += row.executableChf;
    acc.executionGapChf += row.executionGapChf;
    return acc;
  }, { intendedChf: 0, executableChf: 0, executionGapChf: 0 });

  return {
    rows,
    totals: {
      intendedChf: Number(totals.intendedChf.toFixed(2)),
      executableChf: Number(totals.executableChf.toFixed(2)),
      executionGapChf: Number(totals.executionGapChf.toFixed(2)),
    },
  };
}

module.exports = { buildExecutionPlan };
