'use strict';

const assert = require('assert');
const quotes = require('../src/quotes');

async function main() {
  const originalOrder = process.env.QUOTE_PROVIDER_ORDER;
  process.env.QUOTE_PROVIDER_ORDER = 'yahoo_last_close,ibkr_tws';

  const order = quotes.configuredProviderOrder();
  assert.deepStrictEqual(order, ['yahoo_last_close', 'ibkr_tws']);

  const providers = quotes.defaultProviders();
  assert.strictEqual(providers[0].id, 'yahoo_last_close');
  assert.strictEqual(providers[1].id, 'ibkr_tws');

  const result = await quotes.getQuote(
    { externalSymbol: 'AAA.DE' },
    {
      providers: [
        {
          id: 'yahoo_last_close',
          label: 'Yahoo Finance last close',
          async fetchQuote() {
            return { ok: true, close: 99.5, currency: 'EUR', quality: 'last_close', asOf: '2026-07-28T07:00:00.000Z' };
          },
        },
      ],
    },
  );

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.providerPath, 'yahoo_last_close');
  assert.strictEqual(result.quality, 'last_close');

  if (originalOrder === undefined) delete process.env.QUOTE_PROVIDER_ORDER;
  else process.env.QUOTE_PROVIDER_ORDER = originalOrder;

  console.log(JSON.stringify({ ok: true, order, providerPath: result.providerPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
