const { proposeTrades } = require('../src/analysis/tradeProposalEngine');

const portfolioPath = process.argv[2];
const holdingsPath = process.argv[3];
if (!portfolioPath || !holdingsPath) {
  console.error('Usage: node scripts/propose-trades.js <portfolio.md> <holdings.md>');
  process.exit(1);
}

const result = proposeTrades({ portfolioPath, holdingsPath });
console.log(JSON.stringify(result, null, 2));
