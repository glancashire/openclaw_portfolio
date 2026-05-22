'use strict';

/* Phase 199 — integration: buildReproposalForCancelledLegs respects circuit breaker. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const realRoot = path.resolve(__dirname, '..');
const { buildReproposalForCancelledLegs } = require(path.join(realRoot, 'src/execution/basketReproposalBuilder'));
const { evaluateCircuitBreaker, loadCircuitBreaker } = require(path.join(realRoot, 'src/execution/cancelLoopBreaker'));

function setupRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-int-'));
  fs.mkdirSync(path.join(root, 'runtime', 'approved-order-baskets', 'etf'), { recursive: true });
  fs.mkdirSync(path.join(root, 'runtime', 'basket-runs', 'etf'), { recursive: true });
  fs.mkdirSync(path.join(root, 'runtime', 'basket-reproposals', 'etf'), { recursive: true });
  return root;
}

function writeApproval(root, id, parentId, legs) {
  const env = {
    schemaVersion: '1.0', portfolio: 'etf', approvalId: id, parentApprovalId: parentId || null,
    createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    legs: legs || [],
  };
  fs.writeFileSync(path.join(root, 'runtime', 'approved-order-baskets', 'etf', `${id}.json`), JSON.stringify(env, null, 2));
  return env;
}

function writeRun(root, id, legs) {
  const state = { schemaVersion: '1.0', portfolio: 'etf', approvalId: id, legs: legs.reduce((acc, l) => { acc[l.legId] = l; return acc; }, {}) };
  fs.writeFileSync(path.join(root, 'runtime', 'basket-runs', 'etf', `${id}.json`), JSON.stringify(state, null, 2));
  return state;
}

(async () => {
  // Build a 3-cancellation lineage so the SPMCHA leg trips at threshold 3.
  const root = setupRoot();
  for (let i = 1; i <= 3; i++) {
    const id = `a-${i}`;
    const parentId = i === 1 ? null : `a-${i - 1}`;
    writeApproval(root, id, parentId, [{ legId: 'leg-1', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', conid: '91639399', action: 'BUY', quantity: 19, limitPrice: 129 + (i - 1) * 0.5, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS' }]);
    writeRun(root, id, [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 9000 + i }]);
  }

  // Mixed cancelled basket: SPMCHA (will trip) + a fresh leg that should still be reproposed.
  const mixedId = 'a-mixed';
  const mixedEnv = writeApproval(root, mixedId, 'a-3', [
    { legId: 'leg-1', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', conid: '91639399', action: 'BUY', quantity: 19, limitPrice: 130.85, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS' },
    { legId: 'leg-2', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8', conid: '75776072', action: 'BUY', quantity: 2, limitPrice: 691, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS' },
  ]);
  const runState = writeRun(root, mixedId, [
    { legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 9004 },
    { legId: 'leg-2', instrument: 'IE00B5BMR087', status: 'cancelled', brokerOrderId: 9005 },
  ]);

  const quoteFn = async (conid) => ({ ask: null, lastClose: conid === 91639399 ? 128.5 : 690 });
  const result = await buildReproposalForCancelledLegs({
    portfolio: 'etf', approvalId: mixedId, runState, originalEnvelope: mixedEnv, quoteFn, rootDir: root, circuitBreakerThreshold: 3,
  });

  // SPMCHA should be excluded (4th consecutive cancellation), SXR8 should be included.
  assert.strictEqual(result.skipped, false, 'reproposal not skipped — SXR8 still reproposable');
  assert.strictEqual(result.envelope.legs.length, 1, 'only SXR8 in reproposal');
  assert.strictEqual(result.envelope.legs[0].instrument, 'IE00B5BMR087');
  assert.strictEqual(result.excludedLegs.length, 1, 'SPMCHA excluded');
  assert.strictEqual(result.excludedLegs[0].instrument, 'CH0130595124');
  assert.strictEqual(result.excludedLegs[0].reason, 'circuit_breaker_tripped');
  assert.strictEqual(result.excludedLegs[0].consecutiveCancellations, 4);

  // Marker file written
  const marker = loadCircuitBreaker({ portfolio: 'etf', instrument: 'CH0130595124', rootDir: root });
  assert(marker, 'marker exists');
  assert.strictEqual(marker.count, 4);
  assert.strictEqual(marker.threshold, 3);

  // ── Edge case: every cancelled leg trips ──
  const allTrippedRoot = setupRoot();
  for (let i = 1; i <= 3; i++) {
    const id = `b-${i}`;
    const parentId = i === 1 ? null : `b-${i - 1}`;
    writeApproval(allTrippedRoot, id, parentId, [{ legId: 'leg-1', instrument: 'CH0130595124', conid: '91639399', action: 'BUY', quantity: 19, limitPrice: 129, currency: 'CHF' }]);
    writeRun(allTrippedRoot, id, [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 9100 + i }]);
  }
  const onlyId = 'b-only';
  const onlyEnv = writeApproval(allTrippedRoot, onlyId, 'b-3', [{ legId: 'leg-1', instrument: 'CH0130595124', conid: '91639399', action: 'BUY', quantity: 19, limitPrice: 130, currency: 'CHF' }]);
  const onlyState = writeRun(allTrippedRoot, onlyId, [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 9104 }]);
  const allTripped = await buildReproposalForCancelledLegs({
    portfolio: 'etf', approvalId: onlyId, runState: onlyState, originalEnvelope: onlyEnv, quoteFn, rootDir: allTrippedRoot, circuitBreakerThreshold: 3,
  });
  assert.strictEqual(allTripped.skipped, true, 'all-tripped => skipped');
  assert.strictEqual(allTripped.reason, 'all_legs_circuit_broken');
  assert.strictEqual(allTripped.excludedLegs.length, 1);

  console.log(JSON.stringify({ ok: true, testsPassed: 2 }));
})().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
