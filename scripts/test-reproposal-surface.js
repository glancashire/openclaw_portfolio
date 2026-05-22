'use strict';

/* Phase 193 — reproposal surface tests. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { listPendingReproposals, describeReproposalItem } = require('../src/reporting/reproposalSurface');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reprop-surf-'));
  const reproposalDir = path.join(root, 'runtime', 'basket-reproposals', 'etf');
  const approvedDir = path.join(root, 'runtime', 'approved-order-baskets', 'etf');
  fs.mkdirSync(reproposalDir, { recursive: true });
  fs.mkdirSync(approvedDir, { recursive: true });
  return { root, reproposalDir, approvedDir };
}

function writeRep(dir, parent, version, legs) {
  const file = path.join(dir, `${parent}-reproposal-${version}.json`);
  fs.writeFileSync(file, JSON.stringify({
    schemaVersion: '1.0',
    portfolio: 'etf',
    approvalId: `${parent}-reproposal-${version}`,
    parentApprovalId: parent,
    reproposalVersion: version,
    createdAt: '2026-05-22T11:00:00Z',
    status: 'pending_user_approval',
    legs,
  }, null, 2));
  return file;
}

(async () => {
  const { root, reproposalDir, approvedDir } = fixture();

  // Empty dir
  assert.deepStrictEqual(listPendingReproposals({ rootDir: root, portfolio: 'etf' }), []);

  // One pending reproposal
  writeRep(reproposalDir, 'basket-A', 1, [
    { legId: 'leg-4', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', action: 'BUY', quantity: 19, limitPrice: 129.50, currency: 'CHF', previousLimit: 129.00 },
  ]);
  let pending = listPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].parentApprovalId, 'basket-A');
  assert.strictEqual(pending[0].version, 1);
  assert.strictEqual(pending[0].approvalId, 'basket-A-reproposal-1');
  assert.strictEqual(pending[0].legs.length, 1);

  // Item describer
  const item = describeReproposalItem({ portfolio: 'etf', reproposal: pending[0] });
  assert.strictEqual(item.kind, 'basket_reproposal_pending');
  assert.strictEqual(item.severity, 'medium');
  assert.strictEqual(item.urgency, 'high');
  assert.strictEqual(item.status, 'pending_user_approval');
  assert.strictEqual(item.parentApprovalId, 'basket-A');
  assert.strictEqual(item.reproposalVersion, 1);
  assert(item.summary.includes('SPMCHA'), 'summary must mention SPMCHA');
  assert(item.summary.includes('129.5'), 'summary must mention limit 129.5');
  assert(item.summary.includes('was 129'), 'summary must show previous limit context');
  assert(item.recommendedOperatorAction.includes('approve'), 'recommended action must mention approve');
  assert(item.recommendedOperatorAction.includes('basket-A'), 'recommended action must include parent id');

  // Once promoted to approved-order-baskets, it disappears from pending
  fs.writeFileSync(path.join(approvedDir, 'basket-A-reproposal-1.json'), JSON.stringify({ status: 'approved' }));
  pending = listPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(pending.length, 0, 'promoted reproposal must not appear as pending');

  // Multiple versions: only un-promoted ones surface
  writeRep(reproposalDir, 'basket-A', 2, [{ legId: 'leg-4', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', action: 'BUY', quantity: 19, limitPrice: 129.65, currency: 'CHF', previousLimit: 129.50 }]);
  writeRep(reproposalDir, 'basket-A', 3, [{ legId: 'leg-4', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', action: 'BUY', quantity: 19, limitPrice: 129.85, currency: 'CHF', previousLimit: 129.65 }]);
  pending = listPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(pending.length, 2);
  assert.deepStrictEqual(pending.map((p) => p.version).sort(), [2, 3]);

  // Different parent in same dir
  writeRep(reproposalDir, 'basket-B', 1, []);
  pending = listPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(pending.length, 3);
  const parents = new Set(pending.map((p) => p.parentApprovalId));
  assert(parents.has('basket-A') && parents.has('basket-B'));

  // Robust against malformed JSON
  fs.writeFileSync(path.join(reproposalDir, 'basket-C-reproposal-1.json'), 'not-valid-json');
  pending = listPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(pending.length, 3, 'malformed JSON must not crash listing');

  // Different portfolio: nothing returned
  pending = listPendingReproposals({ rootDir: root, portfolio: 'crypto' });
  assert.strictEqual(pending.length, 0);

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
