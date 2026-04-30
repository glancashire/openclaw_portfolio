const { fetchLatestPrice } = require('../src/brokers/interactive-brokers/pricing');

async function main() {
  const conid = process.argv[2];
  if (!conid) {
    throw new Error('Usage: node scripts/fetch-interactive-brokers-price.js <conid>');
  }
  const appCode = process.env.IBKR_2FA || null;
  const preferBrowserSession = process.env.IBKR_BROWSER_SESSION === '1';
  const result = await fetchLatestPrice({ conid, portfolio: 'etf', appCode, preferBrowserSession });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
