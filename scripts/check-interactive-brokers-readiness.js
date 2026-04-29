const { getInteractiveBrokersReadiness } = require('../src/brokers/interactive-brokers/readiness');

async function main() {
  const result = await getInteractiveBrokersReadiness({ portfolio: 'etf' });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
