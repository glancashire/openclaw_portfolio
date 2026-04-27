const { proposeInstrumentTrades } = require('../src/analysis/instrumentProposalEngine');

const portfolioPath = process.argv[2];
const holdingsPath = process.argv[3];
if (!portfolioPath || !holdingsPath) {
  console.error('Usage: node scripts/propose-instrument-trades.js <portfolio.md> <holdings.md>');
  process.exit(1);
}

const result = proposeInstrumentTrades({ portfolioPath, holdingsPath });
console.log(JSON.stringify(result, null, 2));
