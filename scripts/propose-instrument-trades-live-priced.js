const { proposeInstrumentTradesLivePriced } = require('../src/analysis/instrumentProposalEngine');

async function main() {
  const portfolioPath = process.argv[2];
  const holdingsPath = process.argv[3];
  if (!portfolioPath || !holdingsPath) {
    throw new Error('Usage: node scripts/propose-instrument-trades-live-priced.js <portfolio.md> <holdings.md>');
  }
  const result = await proposeInstrumentTradesLivePriced({ portfolioPath, holdingsPath });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
