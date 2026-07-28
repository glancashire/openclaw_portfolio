const assert = require('assert');
const { resolveQuoteWithRuntime } = require('../src/quotes/serviceRuntime');
const { resetQuoteServiceRuntime, snapshotProviderHealth } = require('../src/quotes/runtime');

async function main() {
  resetQuoteServiceRuntime();
  let flakyCalls = 0;
  const providers = [
    {
      id: 'flaky',
      label: 'Flaky provider',
      async fetchQuote() {
        flakyCalls += 1;
        return { ok: false, reason: 'flaky_down' };
      },
    },
    {
      id: 'stable',
      label: 'Stable provider',
      async fetchQuote() {
        return { ok: true, price: 101, currency: 'CHF', quality: 'live_or_realtime', asOf: new Date().toISOString() };
      },
    },
  ];

  const context = { conid: '123' };
  await resolveQuoteWithRuntime({ providers, context, options: { disableCache: true } });
  await resolveQuoteWithRuntime({ providers, context, options: { disableCache: true } });
  const third = await resolveQuoteWithRuntime({ providers, context, options: { disableCache: true } });

  assert.strictEqual(third.ok, true);
  assert.strictEqual(third.providerPath, 'stable');
  assert.ok(third.attempts.some((a) => a.reason === 'cooldown_active'));
  assert.strictEqual(flakyCalls, 2);

  const health = snapshotProviderHealth();
  const flaky = health.find((item) => item.providerId === 'flaky');
  assert.ok(flaky);
  assert.ok(flaky.consecutiveFailures >= 2);
  assert.ok(flaky.cooldownUntil);

  console.log(JSON.stringify({ ok: true, flakyCalls, cooldownUntil: flaky.cooldownUntil }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
