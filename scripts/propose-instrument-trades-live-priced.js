const { proposeInstrumentTradesLivePriced } = require('../src/analysis/instrumentProposalEngine');
const { resolvePortfolioInputs } = require('./_resolve-portfolio-inputs');

async function main() {
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  if (!arg1) {
    throw new Error('Usage: node scripts/propose-instrument-trades-live-priced.js <portfolio-dir | portfolio.md> [holdings.md]');
  }
  const { portfolioPath, holdingsPath } = resolvePortfolioInputs(arg1, arg2);
  const result = await proposeInstrumentTradesLivePriced({ portfolioPath, holdingsPath });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
