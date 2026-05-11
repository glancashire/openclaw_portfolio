'use strict';

const assert = require('assert');
const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');

async function main() {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  client.fetchMarketSnapshot = async () => ([{ close: 157.08, '85': 'CHF' }]);

  const result = await client.getOrderQuote({
    conid: '150029461',
    symbol: 'UBSSLI',
    action: 'BUY',
    quantity: 6,
    currency: 'CHF',
    exchange: 'SMART',
    primaryExchange: 'EBS',
    secType: 'STK',
  });

  assert.strictEqual(result.ok, true, 'expected quote result to succeed');
  assert.strictEqual(result.quote.referencePrice, 157.08, 'expected close to be used as safe fallback reference');
  assert.strictEqual(result.quote.priceSource, 'interactive-brokers-delayed-close-fallback', 'expected delayed-close fallback price source when live fields are absent');
  assert.strictEqual(result.quote.currency, 'CHF', 'expected currency preserved');

  console.log(JSON.stringify({ ok: true, quote: result.quote }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
