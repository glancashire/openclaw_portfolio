const { syncInteractiveBrokersHoldings } = require('../src/brokers/interactive-brokers/holdingsSync');

async function main() {
  const portfolioDir = process.argv[2];
  const accountId = process.argv[3];
  if (!portfolioDir) {
    throw new Error('Usage: node scripts/sync-interactive-brokers-holdings.js <portfolio-dir> [accountId]');
  }
  const result = await syncInteractiveBrokersHoldings({ portfolioDir, accountId });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
