const path = require('path');
const { stagePortfolioOrder } = require('../src/execution/portfolioExecution');

async function main() {
  const [portfolioDirArg, orderJsonArg, modeArg] = process.argv.slice(2);
  if (!portfolioDirArg || !orderJsonArg) {
    console.error('Usage: node scripts/stage-portfolio-order.js <portfolio-dir> <order-json> [dry-run|stage|transmit-live]');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);
  const requestedMode = modeArg || 'dry-run';
  const dryRun = requestedMode === 'dry-run';
  const transmitLive = requestedMode === 'transmit-live';

  let order;
  try {
    order = JSON.parse(orderJsonArg);
  } catch (error) {
    console.error(`Invalid order JSON: ${error.message}`);
    process.exit(1);
  }

  const result = await stagePortfolioOrder({
    portfolioDir,
    order,
    dryRun,
    revocableOnly: true,
    transmitLive,
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(2);
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
