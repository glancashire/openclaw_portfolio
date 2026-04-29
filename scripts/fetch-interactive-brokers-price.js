const { fetchLatestPrice } = require('../src/brokers/interactive-brokers/pricing');

async function main() {
  const conid = process.argv[2];
  if (!conid) {
    throw new Error('Usage: node scripts/fetch-interactive-brokers-price.js <conid>');
  }
  const result = await fetchLatestPrice({ conid, portfolio: 'etf' });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
