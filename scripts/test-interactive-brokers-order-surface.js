const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');

async function main() {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  const quote = await client.getOrderQuote({
    conid: '243939970',
    symbol: 'EMUAA',
    action: 'BUY',
    orderType: 'LMT',
    quantity: 1,
    currency: 'EUR',
  });

  const dryRun = await client.placeOrder({
    conid: '243939970',
    symbol: 'EMUAA',
    action: 'BUY',
    orderType: 'LMT',
    quantity: 1,
    currency: 'EUR',
  }, { dryRun: true });

  console.log(JSON.stringify({ quote, dryRun }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
