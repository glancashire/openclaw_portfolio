'use strict';

// Phase C: the QuoteServiceClient boundary must present a stable contract that
// is transport-agnostic. The in-process transport is the reference; a swapped
// (fake "daemon") transport must work identically without caller changes, and
// malformed transports must be rejected.

const assert = require('assert');
const {
  QuoteServiceClient,
  createInProcessTransport,
  getQuoteServiceClient,
  setQuoteServiceTransport,
  assertTransport,
} = require('../src/quotes/client');
const { resetQuoteServiceRuntime } = require('../src/quotes/runtime');

async function main() {
  resetQuoteServiceRuntime();

  // 1) In-process transport resolves through the runtime and records health.
  const stableProvider = {
    id: 'stable',
    label: 'Stable provider',
    async fetchQuote() {
      return { ok: true, price: 42, currency: 'CHF', quality: 'live_or_realtime', asOf: new Date().toISOString() };
    },
  };
  const inProc = new QuoteServiceClient({ transport: createInProcessTransport({ providers: [stableProvider] }) });
  assert.strictEqual(inProc.transportKind, 'in_process');

  const q = await inProc.getQuote({ conid: '1' }, { disableCache: true });
  assert.strictEqual(q.ok, true);
  assert.strictEqual(q.price, 42);
  assert.strictEqual(q.providerPath, 'stable');

  const batch = await inProc.getQuotes([{ conid: '1' }, { conid: '2' }], { disableCache: true });
  assert.strictEqual(batch.length, 2);
  assert.ok(batch.every((row) => row.ok));

  const health = await inProc.getProviderHealth();
  assert.ok(Array.isArray(health));
  assert.ok(health.find((h) => h.providerId === 'stable'));

  // 2) A swapped "daemon-like" transport satisfies the same contract with no
  //    caller changes. It only implements the contract methods.
  const calls = [];
  const fakeDaemon = {
    kind: 'fake_daemon',
    async getQuote({ context, options }) {
      calls.push(['getQuote', context, options]);
      return { ok: true, price: 7, currency: 'CHF', quality: 'last_close', providerPath: 'daemon', asOf: null, attempts: [] };
    },
    async getQuotes({ contexts }) {
      calls.push(['getQuotes', contexts]);
      return contexts.map(() => ({ ok: true, price: 7, providerPath: 'daemon', attempts: [] }));
    },
    async getProviderHealth() {
      return [{ providerId: 'daemon', status: 'ok' }];
    },
  };
  const client = new QuoteServiceClient({ transport: fakeDaemon });
  assert.strictEqual(client.transportKind, 'fake_daemon');
  const dq = await client.getQuote({ conid: 'x' });
  assert.strictEqual(dq.providerPath, 'daemon');
  assert.strictEqual(dq.price, 7);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0][0], 'getQuote');

  // 3) Malformed transports are rejected up front.
  assert.throws(() => assertTransport({ getQuote() {} }), /missing required method: getQuotes/);
  assert.throws(() => new QuoteServiceClient({ transport: { kind: 'bad' } }), /missing required method/);

  // 4) Shared client is a singleton until reset; setQuoteServiceTransport swaps it.
  const shared1 = getQuoteServiceClient();
  const shared2 = getQuoteServiceClient();
  assert.strictEqual(shared1, shared2);
  assert.strictEqual(shared1.transportKind, 'in_process');
  const swapped = setQuoteServiceTransport(fakeDaemon);
  assert.strictEqual(swapped.transportKind, 'fake_daemon');
  assert.strictEqual(getQuoteServiceClient().transportKind, 'fake_daemon');
  setQuoteServiceTransport(null); // reset
  assert.strictEqual(getQuoteServiceClient().transportKind, 'in_process');

  // 5) Read-only posture: transport contract exposes no write/order methods.
  for (const forbidden of ['submitOrder', 'placeOrder', 'write', 'transmit']) {
    assert.strictEqual(typeof fakeDaemon[forbidden], 'undefined');
    assert.strictEqual(typeof createInProcessTransport()[forbidden], 'undefined');
  }

  console.log(JSON.stringify({ ok: true, transports: ['in_process', 'fake_daemon'] }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
