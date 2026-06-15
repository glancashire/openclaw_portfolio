'use strict';

/*
 * Unit tests for marketRuleResolver — authoritative IBKR tick-size resolution.
 * Pure unit test: uses an in-memory mock client, no broker connection.
 * Covers the R2SC/LSEETF regression (rule 983, tick 0.01 above GBP 25).
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  resolveTick,
  resolveRuleTable,
  ruleIdForVenue,
  incrementForPrice,
  normalizeTable,
  makeTickResolver,
  STATIC_MARKET_RULES,
} = require('../src/execution/marketRuleResolver');

(async () => {
  // --- incrementForPrice: tiered walk ---
  const rule983 = STATIC_MARKET_RULES[983];
  assert.strictEqual(incrementForPrice(rule983, 0.05), 0.0005, 'below 0.1 → 0.0005');
  assert.strictEqual(incrementForPrice(rule983, 3), 0.001, '0.1..5 → 0.001');
  assert.strictEqual(incrementForPrice(rule983, 7), 0.0025, '5..10 → 0.0025');
  assert.strictEqual(incrementForPrice(rule983, 20), 0.005, '10..25 → 0.005');
  assert.strictEqual(incrementForPrice(rule983, 65.16), 0.01, '>=25 → 0.01 (R2SC regression)');
  assert.strictEqual(incrementForPrice(rule983, 25), 0.01, 'exactly 25 → 0.01');

  // edge: invalid price returns the lowest band
  assert.strictEqual(incrementForPrice(rule983, 0), 0.0005, 'price 0 → first band');
  assert.strictEqual(incrementForPrice(null, 10), null, 'no table → null');

  // --- normalizeTable: sorts + drops junk ---
  const messy = normalizeTable([
    { lowEdge: 25, increment: 0.01 },
    { lowEdge: 0, increment: 0.0005 },
    { lowEdge: 5, increment: 0 },        // dropped (increment 0)
    { lowEdge: 'x', increment: 0.1 },    // dropped (NaN edge)
  ]);
  assert.deepStrictEqual(messy, [
    { lowEdge: 0, increment: 0.0005 },
    { lowEdge: 25, increment: 0.01 },
  ], 'normalizeTable sorts and filters');

  // --- ruleIdForVenue: positional pairing of marketRuleIds<->validExchanges ---
  const pairing = {
    marketRuleIds: '983,983,3051,983',
    validExchanges: 'SMART,LSEETF,EUIBSI,TRWBUKETF',
  };
  assert.strictEqual(ruleIdForVenue({ ...pairing, venue: 'LSEETF' }), 983, 'LSEETF → index 1 → 983');
  assert.strictEqual(ruleIdForVenue({ ...pairing, venue: 'EUIBSI' }), 3051, 'EUIBSI → index 2 → 3051');
  assert.strictEqual(ruleIdForVenue({ ...pairing, venue: 'SMART' }), 983, 'SMART → index 0 → 983');
  // unknown venue falls back to SMART-aligned rule, else first
  assert.strictEqual(ruleIdForVenue({ ...pairing, venue: 'NOPE' }), 983, 'unknown venue → SMART rule');
  assert.strictEqual(ruleIdForVenue({ marketRuleIds: '', validExchanges: '' }), null, 'no ids → null');

  // --- resolveRuleTable: cache → live → static precedence ---
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mkt-rule-'));

  // live wins when no cache
  let liveCalls = 0;
  const liveClient = {
    fetchMarketRules: async (ids) => { liveCalls += 1; return { [ids[0]]: [{ lowEdge: 0, increment: 0.02 }] }; },
  };
  const r1 = await resolveRuleTable({ ruleId: 999, client: liveClient, cacheDir: tmpDir });
  assert.strictEqual(r1.source, 'live', 'first call resolves live');
  assert.strictEqual(r1.table[0].increment, 0.02);
  assert.strictEqual(liveCalls, 1);

  // second call hits cache (no new live call)
  const r2 = await resolveRuleTable({ ruleId: 999, client: liveClient, cacheDir: tmpDir });
  assert.strictEqual(r2.source, 'cache', 'second call hits cache');
  assert.strictEqual(liveCalls, 1, 'no extra live call after cache write');

  // static fallback when live unavailable and not cached
  const r3 = await resolveRuleTable({ ruleId: 983, client: null, cacheDir: tmpDir });
  assert.strictEqual(r3.source, 'static', 'known rule → static fallback');
  assert.strictEqual(incrementForPrice(r3.table, 65), 0.01);

  // unknown rule, no client → none
  const r4 = await resolveRuleTable({ ruleId: 4242, client: null, cacheDir: tmpDir });
  assert.strictEqual(r4.source, 'none');
  assert.strictEqual(r4.table, null);

  // --- resolveTick: end-to-end for the R2SC case ---
  const r2scDetails = {
    conid: 159310437,
    minTick: 0.0005, // misleading flat value that caused the original rejection
    marketRuleIds: '983,983,3051,983',
    validExchanges: 'SMART,LSEETF,EUIBSI,TRWBUKETF',
    primaryExchange: 'LSEETF',
  };
  const tickR2sc = await resolveTick({ contractDetails: r2scDetails, price: 65.16, venue: 'LSEETF', client: null, cacheDir: tmpDir });
  assert.strictEqual(tickR2sc.tick, 0.01, 'R2SC @ 65.16 resolves to 0.01, NOT minTick 0.0005');
  assert.strictEqual(tickR2sc.ruleId, 983);

  // resolveTick with no rule resolvable falls back to coarser of minTick/heuristic
  const noRule = await resolveTick({ contractDetails: { minTick: 0.0005 }, price: 65, client: null, cacheDir: tmpDir });
  assert(noRule.tick >= 0.0005, 'fallback never finer than minTick');
  assert.strictEqual(noRule.source, 'mintick_or_coarse');

  // --- makeTickResolver: caches contract details per conid ---
  let detailCalls = 0;
  const resolverClient = {
    fetchContractDetailsByConid: async () => { detailCalls += 1; return r2scDetails; },
    fetchMarketRules: async (ids) => ({ [ids[0]]: STATIC_MARKET_RULES[983] }),
  };
  const tickFn = makeTickResolver({ client: resolverClient, cacheDir: tmpDir });
  const a = await tickFn({ conid: 159310437, venue: 'LSEETF', price: 65.16 });
  const b = await tickFn({ conid: 159310437, venue: 'LSEETF', price: 30 });
  assert.strictEqual(a.tick, 0.01);
  assert.strictEqual(b.tick, 0.01);
  assert.strictEqual(detailCalls, 1, 'contract details cached per conid across calls');

  // resolver never throws on client failure
  const brokenClient = { fetchContractDetailsByConid: async () => { throw new Error('boom'); } };
  const tickFn2 = makeTickResolver({ client: brokenClient, cacheDir: tmpDir });
  const safe = await tickFn2({ conid: 1, venue: 'X', price: 65 });
  assert(Number.isFinite(safe.tick) && safe.tick > 0, 'broken client still yields a safe tick');

  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('test-market-rule-resolver: all assertions passed');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
