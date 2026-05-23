const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  approvalEnvelopeTerminal,
  circuitBreakerCleared,
  sweepSupersededBasketProposals,
  sweepSupersededApprovedBaskets,
  sweepClearedCircuitBreakers,
  sweepRuntimeArtifacts,
} = require('../src/execution/runtimeCleanup');

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

(function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-cleanup-'));
  const now = new Date('2026-05-23T12:30:00Z');

  assert.strictEqual(approvalEnvelopeTerminal({ status: 'completed' }), true);
  assert.strictEqual(approvalEnvelopeTerminal({ legs: [{ status: 'filled' }, { status: 'cancelled' }] }), true);
  assert.strictEqual(approvalEnvelopeTerminal({ legs: [{ status: 'approved' }] }), false);
  assert.strictEqual(circuitBreakerCleared({ clearedAt: '2026-05-10T00:00:00Z', count: 3 }), true);
  assert.strictEqual(circuitBreakerCleared({ count: 0, lastSeenAt: '2026-05-01T00:00:00Z' }), true);
  assert.strictEqual(circuitBreakerCleared({ count: 2, lastSeenAt: '2026-05-01T00:00:00Z' }), false);

  const proposalDir = path.join(root, 'runtime', 'basket-proposals', 'etf', '.superseded');
  writeJson(path.join(proposalDir, 'old.json'), { proposalId: 'old', generatedAt: '2026-05-01T00:00:00Z' });
  writeJson(path.join(proposalDir, 'fresh.json'), { proposalId: 'fresh', generatedAt: '2026-05-22T00:00:00Z' });

  const proposalSweep = sweepSupersededBasketProposals({ rootDir: root, portfolio: 'etf', now, keepDays: 7, dryRun: false });
  assert.strictEqual(proposalSweep.removed.length, 1, 'expected one stale superseded proposal removed');
  assert.strictEqual(fs.existsSync(path.join(proposalDir, 'old.json')), false, 'stale proposal should be deleted');
  assert.strictEqual(fs.existsSync(path.join(proposalDir, 'fresh.json')), true, 'fresh proposal should remain');

  const approvedDir = path.join(root, 'runtime', 'approved-order-baskets', 'etf', '.superseded');
  writeJson(path.join(approvedDir, 'done.json'), {
    approvalId: 'done',
    approvedAt: '2026-04-01T00:00:00Z',
    status: 'completed',
    legs: [{ status: 'filled' }],
  });
  writeJson(path.join(approvedDir, 'active.json'), {
    approvalId: 'active',
    approvedAt: '2026-04-01T00:00:00Z',
    status: 'approved',
    legs: [{ status: 'approved' }],
  });

  const approvedSweep = sweepSupersededApprovedBaskets({ rootDir: root, portfolio: 'etf', now, keepDays: 30, dryRun: false });
  assert.strictEqual(approvedSweep.removed.length, 1, 'expected one terminal approved basket removed');
  assert.strictEqual(fs.existsSync(path.join(approvedDir, 'done.json')), false, 'terminal basket should be deleted');
  assert.strictEqual(fs.existsSync(path.join(approvedDir, 'active.json')), true, 'non-terminal basket should remain');

  const breakerDir = path.join(root, 'runtime', 'circuit-breakers', 'etf');
  writeJson(path.join(breakerDir, 'cleared.json'), {
    instrument: 'cleared',
    count: 0,
    clearedAt: '2026-05-10T00:00:00Z',
  });
  writeJson(path.join(breakerDir, 'active.json'), {
    instrument: 'active',
    count: 3,
    lastSeenAt: '2026-05-10T00:00:00Z',
  });

  const breakerSweep = sweepClearedCircuitBreakers({ rootDir: root, portfolio: 'etf', now, keepDays: 7, dryRun: false });
  assert.strictEqual(breakerSweep.removed.length, 1, 'expected one cleared breaker removed');
  assert.strictEqual(fs.existsSync(path.join(breakerDir, 'cleared.json')), false, 'cleared breaker should be deleted');
  assert.strictEqual(fs.existsSync(path.join(breakerDir, 'active.json')), true, 'active breaker should remain');

  writeJson(path.join(proposalDir, 'dry-run-old.json'), { proposalId: 'dry-run-old', generatedAt: '2026-05-01T00:00:00Z' });
  const dryRun = sweepRuntimeArtifacts({ rootDir: root, portfolio: 'etf', now, dryRun: true, proposalKeepDays: 7, approvedKeepDays: 30, circuitBreakerKeepDays: 7 });
  assert.strictEqual(dryRun.ok, true);
  assert(dryRun.totals.removed >= 1, 'dry-run should report removable artifacts');
  assert.strictEqual(fs.existsSync(path.join(proposalDir, 'dry-run-old.json')), true, 'dry-run must not delete files');

  console.log(JSON.stringify({ ok: true, totals: dryRun.totals }, null, 2));
})();
