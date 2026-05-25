#!/usr/bin/env node
'use strict';

/* Regression: clearCircuitBreaker records reason + operator metadata to a
 * sibling audit log so we don't lose the history of cleared markers.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { saveCircuitBreaker, clearCircuitBreaker } = require('../src/execution/cancelLoopBreaker');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function withTempRoot(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-audit-'));
  try { fn(root); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('clearCircuitBreaker writes an audit entry with reason and operator', () => {
  withTempRoot((root) => {
    // Seed a tripped marker via writeCircuitBreaker.
    saveCircuitBreaker({
      portfolio: 'etf',
      instrument: 'CH0130595124',
      rootDir: root,
      marker: { count: 3, threshold: 3, lastBrokerOrderIds: [9127, 9128, 9129], firstTrippedAt: '2026-05-22T15:19:58.190Z', lastSeenAt: '2026-05-22T15:19:58.190Z', latestApprovalId: 'test-approval', ancestorsWalked: 3 },
    });
    const markerFile = path.join(root, 'runtime', 'circuit-breakers', 'etf', 'CH0130595124.json');
    assert(fs.existsSync(markerFile), 'expected marker to be written');

    const result = clearCircuitBreaker({
      portfolio: 'etf',
      instrument: 'CH0130595124',
      rootDir: root,
      reason: 'root cause was holiday + insufficient settled cash',
      operator: 'bb8',
    });
    assert.strictEqual(result.cleared, true);
    assert(!fs.existsSync(markerFile), 'expected marker to be removed');

    const auditFile = path.join(root, 'runtime', 'circuit-breakers', 'etf', '_cleared.log.jsonl');
    assert(fs.existsSync(auditFile), 'expected audit log to be created');
    const lines = fs.readFileSync(auditFile, 'utf8').trim().split(/\n/).filter(Boolean);
    assert.strictEqual(lines.length, 1, `expected 1 audit line, got ${lines.length}`);
    const entry = JSON.parse(lines[0]);
    assert.strictEqual(entry.portfolio, 'etf');
    assert.strictEqual(entry.instrument, 'CH0130595124');
    assert.strictEqual(entry.reason, 'root cause was holiday + insufficient settled cash');
    assert.strictEqual(entry.operator, 'bb8');
    assert(entry.clearedAt, 'expected clearedAt timestamp');
    assert(entry.priorMarker, 'expected priorMarker to be captured');
    assert.strictEqual(entry.priorMarker.count, 3);
  });
});

test('clearCircuitBreaker without reason still writes an audit entry (null reason)', () => {
  withTempRoot((root) => {
    saveCircuitBreaker({
      portfolio: 'etf',
      instrument: 'CH0130595124',
      rootDir: root,
      marker: { count: 3, threshold: 3, lastBrokerOrderIds: [], firstTrippedAt: '2026-05-22T15:19:58.190Z', lastSeenAt: '2026-05-22T15:19:58.190Z', latestApprovalId: 't', ancestorsWalked: 0 },
    });
    const result = clearCircuitBreaker({ portfolio: 'etf', instrument: 'CH0130595124', rootDir: root });
    assert.strictEqual(result.cleared, true);
    const auditFile = path.join(root, 'runtime', 'circuit-breakers', 'etf', '_cleared.log.jsonl');
    const entry = JSON.parse(fs.readFileSync(auditFile, 'utf8').trim());
    assert.strictEqual(entry.reason, null);
    assert.strictEqual(entry.operator, null);
  });
});

test('clearCircuitBreaker returns no_marker_present when nothing to clear', () => {
  withTempRoot((root) => {
    const result = clearCircuitBreaker({ portfolio: 'etf', instrument: 'X', rootDir: root, reason: 'noop' });
    assert.strictEqual(result.cleared, false);
    assert.strictEqual(result.reason, 'no_marker_present');
  });
});

console.log(JSON.stringify({ ok: true, passed }));
