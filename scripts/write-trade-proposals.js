const path = require('path');
const { proposeInstrumentTrades } = require('../src/analysis/instrumentProposalEngine');
const { appendTradeProposals } = require('../src/analysis/tradeLogWriter');

const portfolioDir = process.argv[2];
if (!portfolioDir) {
  console.error('Usage: node scripts/write-trade-proposals.js <portfolio-dir>');
  process.exit(1);
}

const portfolioPath = path.join(portfolioDir, 'portfolio.md');
const holdingsPath = path.join(portfolioDir, 'holdings.md');
const tradesPath = path.join(portfolioDir, 'trades.md');
const result = proposeInstrumentTrades({ portfolioPath, holdingsPath });
const writeResult = appendTradeProposals(tradesPath, result.proposals);
console.log(JSON.stringify({ ...result, writeResult }, null, 2));
