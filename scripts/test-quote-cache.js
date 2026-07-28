const assert = require('assert');
const { getQuote } = require('../src/quotes');
const { resetQuoteServiceRuntime } = require('../src/quotes/runtime');

async function main() {
  resetQuoteServiceRuntime();
  let calls = 0;
  const providers = [
    {
      id: 'cacheable',
      label: 'Cacheable provider',
      async fetchQuote() {
        calls += 1;
        return { ok: true, price: 55, currency: 'CHF', quality: 'live_or_realtime', asOf: new Date().toISOString() };
      },
    },
  ];

  const context = { conid: '321' };
  const first = await getQuote(context, { providers });
  const second = await getQuote(context, { providers });

  assert.strictEqual(first.ok, true);
  assert.strictEqual(second.ok, true);
  assert.strictEqual(calls, 1);
  assert.strictEqual(second.cacheHit, true);

  console.log(JSON.stringify({ ok: true, calls, cacheHit: second.cacheHit }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
