const { proposeInstrumentTrades } = require('../src/analysis/instrumentProposalEngine');
const { resolvePortfolioInputs } = require('./_resolve-portfolio-inputs');

const arg1 = process.argv[2];
const arg2 = process.argv[3];
if (!arg1) {
  console.error('Usage: node scripts/propose-instrument-trades.js <portfolio-dir | portfolio.md> [holdings.md]');
  process.exit(1);
}

const { portfolioPath, holdingsPath } = resolvePortfolioInputs(arg1, arg2);
const result = proposeInstrumentTrades({ portfolioPath, holdingsPath });
console.log(JSON.stringify(result, null, 2));
