const path = require('path');
const { syncPortfolioOrderStatus } = require('../src/execution/portfolioExecution');

async function main() {
  const [portfolioDirArg, orderIdArg, selectorJsonArg = '{}'] = process.argv.slice(2);
  if (!portfolioDirArg || !orderIdArg) {
    console.error('Usage: node scripts/sync-portfolio-order-status.js <portfolio-dir> <order-id> [selector-json]');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);
  const selector = JSON.parse(selectorJsonArg);
  const result = await syncPortfolioOrderStatus({ portfolioDir, orderId: orderIdArg, selector });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(2);
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
