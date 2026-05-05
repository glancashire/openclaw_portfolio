const path = require('path');
const { rejectPortfolioTrade } = require('../src/execution/portfolioExecution');

async function main() {
  const [portfolioDirArg, selectorJsonArg] = process.argv.slice(2);
  if (!portfolioDirArg || !selectorJsonArg) {
    console.error('Usage: node scripts/reject-portfolio-trade.js <portfolio-dir> <selector-json>');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);
  const selector = JSON.parse(selectorJsonArg);
  const result = await rejectPortfolioTrade({ portfolioDir, selector });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(2);
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
