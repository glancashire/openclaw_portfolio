const path = require('path');
const { proposeInstrumentTrades, proposeInstrumentTradesLivePriced } = require('../src/analysis/instrumentProposalEngine');
const { appendTradeProposals } = require('../src/analysis/tradeLogWriter');

async function main() {
  const args = process.argv.slice(2);
  const livePriced = args.includes('--live-priced');
  const portfolioDir = args.find((arg) => !arg.startsWith('-'));
  if (!portfolioDir) {
    console.error('Usage: node scripts/write-trade-proposals.js <portfolio-dir> [--live-priced]');
    process.exit(1);
  }

  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const result = livePriced
    ? await proposeInstrumentTradesLivePriced({ portfolioPath, holdingsPath, portfolio: path.basename(portfolioDir) })
    : proposeInstrumentTrades({ portfolioPath, holdingsPath });
  const writeResult = appendTradeProposals(tradesPath, result.proposals);
  console.log(JSON.stringify({ ...result, livePriced, writeResult }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
