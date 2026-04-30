const { searchEtfInstruments } = require('../src/brokers/interactive-brokers/instruments');
const { fetchLatestPrice } = require('../src/brokers/interactive-brokers/pricing');

async function main() {
  const query = process.argv[2] || 'CSPX';
  const search = await searchEtfInstruments({ query, portfolio: 'etf' });
  const best = search?.instruments?.[0] || null;
  const price = best?.conid ? await fetchLatestPrice({ conid: best.conid, portfolio: 'etf' }) : null;
  console.log(JSON.stringify({ query, search, best, price }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
