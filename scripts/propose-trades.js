const { proposeTrades } = require('../src/analysis/tradeProposalEngine');
const { resolvePortfolioInputs } = require('./_resolve-portfolio-inputs');

const arg1 = process.argv[2];
const arg2 = process.argv[3];
if (!arg1) {
  console.error('Usage: node scripts/propose-trades.js <portfolio-dir | portfolio.md> [holdings.md]');
  process.exit(1);
}

const { portfolioPath, holdingsPath } = resolvePortfolioInputs(arg1, arg2);
const result = proposeTrades({ portfolioPath, holdingsPath });
console.log(JSON.stringify(result, null, 2));
