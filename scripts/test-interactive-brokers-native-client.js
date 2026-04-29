const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');

async function main() {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  const config = client.configurationStatus();
  const auth = await client.authenticate();
  const accounts = await client.fetchAccounts();
  const positions = await client.fetchPositions(config.accountId || process.env.IBKR_ACCOUNT_ID || undefined).catch((error) => ({ error: error.message }));
  const ledger = await client.fetchLedger(process.env.IBKR_ACCOUNT_ID || 'All').catch((error) => ({ error: error.message }));
  console.log(JSON.stringify({ config, auth, accounts, positions, ledger }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
