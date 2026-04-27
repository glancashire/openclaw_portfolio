const { IgApiClient } = require('../src/brokers/ig/client');

async function main() {
  const client = new IgApiClient({ portfolio: 'etf' });
  const result = await client.authenticate();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
