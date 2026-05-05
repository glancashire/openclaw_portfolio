const path = require('path');
const { resyncPortfolioOrders } = require('../src/execution/portfolioExecution');

async function main() {
  const [portfolioDirArg] = process.argv.slice(2);
  if (!portfolioDirArg) {
    console.error('Usage: node scripts/resync-portfolio-orders.js <portfolio-dir>');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);
  const result = await resyncPortfolioOrders({ portfolioDir });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(2);
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
