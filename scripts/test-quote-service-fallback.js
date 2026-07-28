'use strict';

const assert = require('assert');
const { resolveQuote, formatAgeLabel } = require('../src/quotes/quoteService');

(async function main() {
  const providers = [
    {
      id: 'ibkr_web_api',
      label: 'IBKR Web API',
      async fetchQuote() {
        return { ok: false, reason: 'web_down', note: 'web unavailable' };
      },
    },
    {
      id: 'ibkr_tws',
      label: 'IBKR TWS API',
      async fetchQuote() {
        return { ok: true, price: 123.45, ask: 123.5, currency: 'CHF', quality: 'live_or_realtime', asOf: new Date(Date.now() - 15_000).toISOString() };
      },
    },
    {
      id: 'yahoo_last_close',
      label: 'Yahoo',
      async fetchQuote() {
        return { ok: true, close: 120, currency: 'CHF', quality: 'last_close' };
      },
    },
  ];

  const result = await resolveQuote({ providers, context: { conid: '1' } });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.providerPath, 'ibkr_tws');
  assert.strictEqual(result.providerLabel, 'IBKR TWS API');
  assert.strictEqual(result.quality, 'live_or_realtime');
  assert.strictEqual(result.attempts.length, 2);
  assert.strictEqual(result.attempts[0].providerPath, 'ibkr_web_api');
  assert.strictEqual(result.attempts[1].providerPath, 'ibkr_tws');
  assert.ok(result.ageSeconds >= 0);
  assert.strictEqual(formatAgeLabel(15), '15s');

  console.log(JSON.stringify({ ok: true, providerPath: result.providerPath, ageLabel: result.ageLabel }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
