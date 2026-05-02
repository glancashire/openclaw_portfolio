const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');

async function main() {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });

  let marketBuyBlocked;
  try {
    marketBuyBlocked = await client.placeOrder({
      symbol: 'EMUAA',
      conid: '243939970',
      action: 'BUY',
      orderType: 'MKT',
      quantity: 1,
      currency: 'EUR',
      exchange: 'SMART',
      secType: 'STK',
    }, { dryRun: false, revocableOnly: true });
  } catch (error) {
    marketBuyBlocked = { ok: false, reason: 'exception', error: error.message };
  }

  let nonRevocableBlocked;
  try {
    nonRevocableBlocked = await client.placeOrder({
      symbol: 'EMUAA',
      conid: '243939970',
      action: 'BUY',
      orderType: 'LMT',
      quantity: 1,
      limitPrice: 38.5,
      currency: 'EUR',
      exchange: 'SMART',
      secType: 'STK',
    }, { dryRun: false, revocableOnly: false });
  } catch (error) {
    nonRevocableBlocked = { ok: false, reason: 'exception', error: error.message };
  }

  console.log(JSON.stringify({ marketBuyBlocked, nonRevocableBlocked }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
