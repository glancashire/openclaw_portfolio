#!/usr/bin/env node
'use strict';

/* Phase Cleanup-1D regression: holdings sync wall-clock + avg-cost diff guard.
 *
 * Covers:
 * - fetchSnapshotsConcurrent: bounded parallelism, per-call timeout, slow
 *   conids do not stall the whole sync.
 * - writeAvgCostSidecarIfChanged: writes when missing, writes on diff,
 *   skips when identical, skips when only key-order differs.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { fetchSnapshotsConcurrent } = require('../src/brokers/interactive-brokers/holdingsSync');
const {
  writeAvgCostSidecarIfChanged,
  canonicalizeAvgCostMap,
} = require('../src/brokers/shared/holdingsSnapshot');

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function makeStubClient(behaviour = {}) {
  return {
    async fetchMarketSnapshot(conids) {
      const conid = conids[0];
      const fn = behaviour[String(conid)];
      if (typeof fn === 'function') return fn();
      return [{ conid: String(conid), '31': 100 }];
    },
  };
}

function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

(async () => {
  await test('fetchSnapshotsConcurrent fetches all conids', async () => {
    const client = makeStubClient();
    const map = await fetchSnapshotsConcurrent(client, ['111', '222', '333'], { concurrency: 2, perCallTimeoutMs: 200 });
    assert.strictEqual(map.size, 3);
    assert(map.get('111'));
    assert(map.get('222'));
    assert(map.get('333'));
  });

  await test('fetchSnapshotsConcurrent honours per-call timeout', async () => {
    const client = makeStubClient({
      slow: () => new Promise(() => {}), // never resolves
    });
    const start = Date.now();
    const map = await fetchSnapshotsConcurrent(client, ['111', 'slow', '333'], {
      concurrency: 4,
      perCallTimeoutMs: 60,
    });
    const elapsed = Date.now() - start;
    assert(map.get('111'), 'fast conid 111 should resolve');
    assert(map.get('333'), 'fast conid 333 should resolve');
    assert(!map.has('slow'), 'slow conid must time out and be absent');
    assert(elapsed < 500, `expected to complete fast despite stuck conid; took ${elapsed}ms`);
  });

  await test('fetchSnapshotsConcurrent provides bounded parallelism speedup', async () => {
    const client = makeStubClient({
      a: () => delay(80, [{ '31': 1 }]),
      b: () => delay(80, [{ '31': 2 }]),
      c: () => delay(80, [{ '31': 3 }]),
      d: () => delay(80, [{ '31': 4 }]),
    });
    const start = Date.now();
    const map = await fetchSnapshotsConcurrent(client, ['a', 'b', 'c', 'd'], { concurrency: 4, perCallTimeoutMs: 1000 });
    const elapsed = Date.now() - start;
    assert.strictEqual(map.size, 4);
    // Sequential would be ~320ms; parallel @4 should be ~80-200ms with overhead.
    assert(elapsed < 250, `expected parallel speedup; took ${elapsed}ms`);
  });

  await test('canonicalizeAvgCostMap is stable under key-order changes', () => {
    const a = { B: 2, A: 1, C: 3 };
    const b = { C: 3, A: 1, B: 2 };
    assert.strictEqual(canonicalizeAvgCostMap(a), canonicalizeAvgCostMap(b));
  });

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'avgcost-'));
  const sidecarPath = path.join(tmpRoot, 'holdings-avg-cost.json');

  await test('writeAvgCostSidecarIfChanged writes when sidecar missing', () => {
    assert(!fs.existsSync(sidecarPath));
    const out = writeAvgCostSidecarIfChanged(sidecarPath, { A: 1, B: 2 });
    assert.strictEqual(out.written, true);
    assert(fs.existsSync(sidecarPath));
  });

  await test('writeAvgCostSidecarIfChanged skips identical write', () => {
    const before = fs.statSync(sidecarPath).mtimeMs;
    // Wait a few ms to ensure mtime would change if we wrote.
    const start = Date.now();
    while (Date.now() - start < 10) { /* spin */ }
    const out = writeAvgCostSidecarIfChanged(sidecarPath, { A: 1, B: 2 });
    assert.strictEqual(out.written, false);
    const after = fs.statSync(sidecarPath).mtimeMs;
    assert.strictEqual(after, before, 'mtime must be unchanged when content is identical');
  });

  await test('writeAvgCostSidecarIfChanged skips key-order-only diffs', () => {
    const before = fs.statSync(sidecarPath).mtimeMs;
    const start = Date.now();
    while (Date.now() - start < 10) { /* spin */ }
    const out = writeAvgCostSidecarIfChanged(sidecarPath, { B: 2, A: 1 });
    assert.strictEqual(out.written, false);
    const after = fs.statSync(sidecarPath).mtimeMs;
    assert.strictEqual(after, before, 'mtime must be unchanged when only key order differs');
  });

  await test('writeAvgCostSidecarIfChanged writes when value changes', () => {
    const out = writeAvgCostSidecarIfChanged(sidecarPath, { A: 1, B: 99 });
    assert.strictEqual(out.written, true);
    const fresh = JSON.parse(fs.readFileSync(sidecarPath, 'utf8'));
    assert.strictEqual(fresh.B, 99);
  });

  // Cleanup
  fs.rmSync(tmpRoot, { recursive: true, force: true });

  console.log(JSON.stringify({ ok: true, passed }, null, 2));
})().catch((err) => { console.error(err); process.exit(1); });
