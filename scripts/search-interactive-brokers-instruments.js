const { searchEtfInstruments } = require('../src/brokers/interactive-brokers/instruments');

async function main() {
  const query = process.argv[2];
  if (!query) {
    throw new Error('Usage: node scripts/search-interactive-brokers-instruments.js <query>');
  }
  const appCode = process.env.IBKR_2FA || null;
  const preferBrowserSession = process.env.IBKR_BROWSER_SESSION === '1';
  const result = await searchEtfInstruments({ query, portfolio: 'etf', appCode, preferBrowserSession });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
