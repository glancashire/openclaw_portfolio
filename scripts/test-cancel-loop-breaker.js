'use strict';

/* Phase 199 — cancel-loop circuit breaker tests. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const realRoot = path.resolve(__dirname, '..');
const {
  walkReproposalLineage,
  countConsecutiveCancellations,
  evaluateCircuitBreaker,
  loadCircuitBreaker,
  clearCircuitBreaker,
  listCircuitBreakers,
} = require(path.join(realRoot, 'src/execution/cancelLoopBreaker'));

function setupRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-'));
  fs.mkdirSync(path.join(root, 'runtime', 'approved-order-baskets', 'etf', '.superseded'), { recursive: true });
  fs.mkdirSync(path.join(root, 'runtime', 'basket-runs', 'etf', '.superseded'), { recursive: true });
  return root;
}

function writeApproval(root, id, parentId) {
  const env = {
    schemaVersion: '1.0',
    portfolio: 'etf',
    approvalId: id,
    parentApprovalId: parentId || null,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    legs: [],
  };
  fs.writeFileSync(path.join(root, 'runtime', 'approved-order-baskets', 'etf', `${id}.json`), JSON.stringify(env, null, 2));
}

function writeRun(root, id, legs) {
  const state = {
    schemaVersion: '1.0',
    portfolio: 'etf',
    approvalId: id,
    legs: legs.reduce((acc, l) => { acc[l.legId] = l; return acc; }, {}),
    summary: { total: legs.length, executed: 0, blocked: 0, failed: 0, submitted: 0, filled: legs.filter(l => l.status === 'filled').length, cancelled: legs.filter(l => l.status === 'cancelled').length },
  };
  fs.writeFileSync(path.join(root, 'runtime', 'basket-runs', 'etf', `${id}.json`), JSON.stringify(state, null, 2));
}

(async () => {
  // ── Test 1: single round, no cancellations ──
  let root = setupRoot();
  writeApproval(root, 'a-1', null);
  writeRun(root, 'a-1', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'filled', brokerOrderId: 1001 }]);
  let result = countConsecutiveCancellations({ portfolio: 'etf', instrument: 'CH0130595124', latestApprovalId: 'a-1', rootDir: root });
  assert.strictEqual(result.count, 0, 'no cancellations => count 0');

  // ── Test 2: 3 consecutive cancellations across lineage ──
  root = setupRoot();
  writeApproval(root, 'a-1', null);
  writeRun(root, 'a-1', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 1001 }]);
  writeApproval(root, 'a-1-r-1', 'a-1');
  writeRun(root, 'a-1-r-1', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 1002 }]);
  writeApproval(root, 'a-1-r-1-r-1', 'a-1-r-1');
  writeRun(root, 'a-1-r-1-r-1', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 1003 }]);
  result = countConsecutiveCancellations({ portfolio: 'etf', instrument: 'CH0130595124', latestApprovalId: 'a-1-r-1-r-1', rootDir: root });
  assert.strictEqual(result.count, 3);
  assert.deepStrictEqual(result.brokerOrderIds, [1003, 1002, 1001]);

  // ── Test 3: a fill resets the counter ──
  root = setupRoot();
  writeApproval(root, 'a-1', null);
  writeRun(root, 'a-1', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 1001 }]);
  writeApproval(root, 'a-1-r-1', 'a-1');
  writeRun(root, 'a-1-r-1', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'filled', brokerOrderId: 1002 }]);
  writeApproval(root, 'a-1-r-1-r-1', 'a-1-r-1');
  writeRun(root, 'a-1-r-1-r-1', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 1003 }]);
  result = countConsecutiveCancellations({ portfolio: 'etf', instrument: 'CH0130595124', latestApprovalId: 'a-1-r-1-r-1', rootDir: root });
  assert.strictEqual(result.count, 1, 'fill in middle resets — only most recent cancel counts');

  // ── Test 4: archived (.superseded) approval is followed ──
  root = setupRoot();
  // Active leaf
  writeApproval(root, 'a-1-r-1-r-1', 'a-1-r-1');
  writeRun(root, 'a-1-r-1-r-1', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 1003 }]);
  // Archived ancestors
  const arcAppr = path.join(root, 'runtime', 'approved-order-baskets', 'etf', '.superseded');
  const arcRun = path.join(root, 'runtime', 'basket-runs', 'etf', '.superseded');
  fs.writeFileSync(path.join(arcAppr, 'a-1-r-1.json'), JSON.stringify({ approvalId: 'a-1-r-1', parentApprovalId: 'a-1', legs: [] }, null, 2));
  fs.writeFileSync(path.join(arcRun, 'a-1-r-1.json'), JSON.stringify({ approvalId: 'a-1-r-1', legs: { 'leg-1': { legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 1002 } } }, null, 2));
  fs.writeFileSync(path.join(arcAppr, 'a-1.json'), JSON.stringify({ approvalId: 'a-1', parentApprovalId: null, legs: [] }, null, 2));
  fs.writeFileSync(path.join(arcRun, 'a-1.json'), JSON.stringify({ approvalId: 'a-1', legs: { 'leg-1': { legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 1001 } } }, null, 2));
  result = countConsecutiveCancellations({ portfolio: 'etf', instrument: 'CH0130595124', latestApprovalId: 'a-1-r-1-r-1', rootDir: root });
  assert.strictEqual(result.count, 3, 'walks through .superseded');

  // ── Test 5: evaluateCircuitBreaker trips at threshold + persists marker ──
  root = setupRoot();
  writeApproval(root, 'a-1', null);
  writeRun(root, 'a-1', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 1 }]);
  writeApproval(root, 'a-2', 'a-1');
  writeRun(root, 'a-2', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 2 }]);
  writeApproval(root, 'a-3', 'a-2');
  writeRun(root, 'a-3', [{ legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', brokerOrderId: 3 }]);
  let evalRes = evaluateCircuitBreaker({ portfolio: 'etf', instrument: 'CH0130595124', latestApprovalId: 'a-3', rootDir: root, threshold: 3 });
  assert.strictEqual(evalRes.tripped, true);
  assert.strictEqual(evalRes.count, 3);
  assert(evalRes.savedPath, 'marker saved');
  const marker = loadCircuitBreaker({ portfolio: 'etf', instrument: 'CH0130595124', rootDir: root });
  assert(marker, 'marker loadable');
  assert.strictEqual(marker.count, 3);
  assert.strictEqual(marker.threshold, 3);

  // ── Test 6: re-evaluating with same lineage updates lastSeenAt but preserves firstTrippedAt ──
  const firstTrip = marker.firstTrippedAt;
  await new Promise((r) => setTimeout(r, 5));
  const reEval = evaluateCircuitBreaker({ portfolio: 'etf', instrument: 'CH0130595124', latestApprovalId: 'a-3', rootDir: root, threshold: 3 });
  assert.strictEqual(reEval.marker.firstTrippedAt, firstTrip, 'firstTrippedAt preserved');

  // ── Test 7: clearCircuitBreaker removes marker; subsequent evaluate with high threshold doesn't trip ──
  const cleared = clearCircuitBreaker({ portfolio: 'etf', instrument: 'CH0130595124', rootDir: root });
  assert.strictEqual(cleared.cleared, true);
  assert.strictEqual(loadCircuitBreaker({ portfolio: 'etf', instrument: 'CH0130595124', rootDir: root }), null);
  const evalAfterClear = evaluateCircuitBreaker({ portfolio: 'etf', instrument: 'CH0130595124', latestApprovalId: 'a-3', rootDir: root, threshold: 5 });
  assert.strictEqual(evalAfterClear.tripped, false);
  assert.strictEqual(loadCircuitBreaker({ portfolio: 'etf', instrument: 'CH0130595124', rootDir: root }), null);

  // ── Test 8: listCircuitBreakers ──
  evaluateCircuitBreaker({ portfolio: 'etf', instrument: 'CH0130595124', latestApprovalId: 'a-3', rootDir: root, threshold: 3 });
  const list = listCircuitBreakers({ rootDir: root });
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].instrument, 'CH0130595124');

  // ── Test 9: walkReproposalLineage returns oldest-first ──
  const lineage = walkReproposalLineage({ portfolio: 'etf', approvalId: 'a-3', rootDir: root });
  assert.deepStrictEqual(lineage.map((e) => e.envelope.approvalId), ['a-1', 'a-2', 'a-3']);

  console.log(JSON.stringify({ ok: true, testsPassed: 9 }));
})().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
