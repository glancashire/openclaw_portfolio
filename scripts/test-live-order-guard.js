#!/usr/bin/env node
'use strict';

/*
 * Unit + regression tests for lib/liveOrderGuard.js
 *
 * Born from the 2026-05-26 duplicate-fill incident: an ad-hoc re-pricer
 * script was invoked twice "to view output" and silently transmitted the
 * same order both times. The guards here prevent both failure modes:
 *
 *   1. requireExplicitLiveOrderIntent() — refuses unless OPENCLAW_PLACE_LIVE_ORDER=1.
 *   2. withIdempotencyKey() — memoises a side-effecting call by key.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  requireExplicitLiveOrderIntent,
  withIdempotencyKey,
  lookupIdempotencyEntry,
  ExplicitLiveOrderIntentRequiredError,
} = require('../lib/liveOrderGuard');

let passed = 0;
function ok(label) { passed += 1; console.log(`  ok — ${label}`); }

(async () => {
  // --- requireExplicitLiveOrderIntent ---
  console.log('requireExplicitLiveOrderIntent');

  // 1. Unset env: throws.
  assert.throws(
    () => requireExplicitLiveOrderIntent({ env: {} }),
    (err) => err instanceof ExplicitLiveOrderIntentRequiredError && err.code === 'OPENCLAW_PLACE_LIVE_ORDER_REQUIRED',
    'unset env must throw ExplicitLiveOrderIntentRequiredError'
  );
  ok('unset env throws');

  // 2. Empty string: throws.
  assert.throws(() => requireExplicitLiveOrderIntent({ env: { OPENCLAW_PLACE_LIVE_ORDER: '' } }));
  ok('empty string throws');

  // 3. Common typos: throw (fail closed).
  for (const bad of ['0', 'true', 'yes', 'on', 'Y', 'enabled', '01', '  1  ']) {
    assert.throws(
      () => requireExplicitLiveOrderIntent({ env: { OPENCLAW_PLACE_LIVE_ORDER: bad } }),
      `${JSON.stringify(bad)} must NOT be accepted as live-order intent`
    );
  }
  ok('common truthy typos all fail closed');

  // 4. Exactly '1' passes.
  assert.strictEqual(requireExplicitLiveOrderIntent({ env: { OPENCLAW_PLACE_LIVE_ORDER: '1' } }), true);
  ok('exactly "1" passes');

  // 5. scriptName surfaces in error message.
  try {
    requireExplicitLiveOrderIntent({ env: {}, scriptName: 'reprice-foo.js' });
    assert.fail('should have thrown');
  } catch (err) {
    assert(/reprice-foo\.js/.test(err.message), 'scriptName must appear in error message');
  }
  ok('scriptName surfaces in error');

  // --- withIdempotencyKey ---
  console.log('withIdempotencyKey');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'idem-'));
  const ledgerPath = 'runtime/idempotency-ledger.json';

  // 6. First call with a key: invokes fn, records outcome.
  let calls = 0;
  const fn1 = async () => { calls += 1; return { orderId: 9131, status: 'submitted' }; };
  const r1 = await withIdempotencyKey({ key: 'reprice-spmcha-2026-05-26', fn: fn1, ledgerPath, rootDir: tmpRoot });
  assert.strictEqual(r1.replayed, false, 'first call must NOT be replayed');
  assert.deepStrictEqual(r1.outcome, { orderId: 9131, status: 'submitted' });
  assert.strictEqual(calls, 1, 'fn must run on first call');
  ok('first call invokes fn and returns outcome');

  // 7. Second call with same key: replays, does NOT invoke fn.
  const fn2 = async () => { calls += 1; return { orderId: 9999, status: 'should-not-happen' }; };
  const r2 = await withIdempotencyKey({ key: 'reprice-spmcha-2026-05-26', fn: fn2, ledgerPath, rootDir: tmpRoot });
  assert.strictEqual(r2.replayed, true, 'second call with same key must be replayed');
  assert.deepStrictEqual(r2.outcome, { orderId: 9131, status: 'submitted' }, 'replayed outcome must match first call');
  assert.strictEqual(calls, 1, 'fn must NOT run on replayed call');
  ok('duplicate key short-circuits and returns prior outcome');

  // 8. Different key passes through.
  const r3 = await withIdempotencyKey({ key: 'reprice-spmcha-2026-05-27', fn: fn2, ledgerPath, rootDir: tmpRoot });
  assert.strictEqual(r3.replayed, false);
  assert.strictEqual(calls, 2, 'fn must run for a new key');
  ok('different key passes through');

  // 9. No key = pass-through (no ledger consultation).
  const r4 = await withIdempotencyKey({ key: null, fn: async () => 42, ledgerPath, rootDir: tmpRoot });
  assert.strictEqual(r4.replayed, false);
  assert.strictEqual(r4.outcome, 42);
  ok('null key = pass-through');

  // 10. fn throws -> nothing written, retry possible.
  const blowKey = 'will-fail-then-retry';
  let attempts = 0;
  await assert.rejects(async () => {
    await withIdempotencyKey({
      key: blowKey,
      fn: async () => { attempts += 1; throw new Error('boom'); },
      ledgerPath, rootDir: tmpRoot,
    });
  }, /boom/);
  // Lookup should NOT find anything for blowKey.
  const found = lookupIdempotencyEntry({ key: blowKey, ledgerPath: path.join(tmpRoot, ledgerPath) });
  assert.strictEqual(found, null, 'failed call must NOT write a ledger entry');
  // Retry succeeds.
  const r5 = await withIdempotencyKey({
    key: blowKey,
    fn: async () => { attempts += 1; return 'recovered'; },
    ledgerPath, rootDir: tmpRoot,
  });
  assert.strictEqual(r5.replayed, false);
  assert.strictEqual(r5.outcome, 'recovered');
  assert.strictEqual(attempts, 2, 'retry should reach fn');
  ok('failed calls do not memoise; retry succeeds');

  // 11. Expired entries do not replay.
  const expKey = 'expired-key';
  await withIdempotencyKey({ key: expKey, fn: async () => 'old', ledgerPath, rootDir: tmpRoot, retentionMs: 1 });
  await new Promise((r) => setTimeout(r, 10));
  let invoked = 0;
  const r6 = await withIdempotencyKey({
    key: expKey,
    fn: async () => { invoked += 1; return 'fresh'; },
    ledgerPath, rootDir: tmpRoot,
    retentionMs: 1, // tiny window so the previous entry is already expired
  });
  assert.strictEqual(r6.replayed, false, 'expired entry must NOT replay');
  assert.strictEqual(r6.outcome, 'fresh');
  assert.strictEqual(invoked, 1);
  ok('expired entries do not replay');

  // 12. Ledger file shape on disk is { entries: [ { key, ts, outcome } ] }.
  const onDisk = JSON.parse(fs.readFileSync(path.join(tmpRoot, ledgerPath), 'utf8'));
  assert(Array.isArray(onDisk.entries), 'ledger must have entries[]');
  for (const e of onDisk.entries) {
    assert(typeof e.key === 'string' && e.key.length > 0, 'ledger entry must have non-empty key');
    assert(Number.isFinite(e.ts), 'ledger entry must have numeric ts');
    assert('outcome' in e, 'ledger entry must record outcome');
  }
  ok('on-disk ledger shape is well-formed');

  console.log(JSON.stringify({ ok: true, asserted: passed }));
})().catch((err) => { console.error(err.stack || String(err)); process.exit(1); });
