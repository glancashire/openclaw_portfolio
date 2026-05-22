'use strict';

/* Phase 191 — promoter unit + integration + idempotency tests. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promoteReproposalToApproval, latestReproposal } = require('../src/execution/basketReproposalPromoter');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'promoter-'));
  const reproposalDir = path.join(root, 'runtime', 'basket-reproposals', 'etf');
  fs.mkdirSync(reproposalDir, { recursive: true });
  return { root, reproposalDir };
}

function writeEnvelope(dir, parent, version, overrides = {}) {
  const file = path.join(dir, `${parent}-reproposal-${version}.json`);
  const envelope = {
    schemaVersion: '1.0',
    portfolio: 'etf',
    approvalId: `${parent}-reproposal-${version}`,
    parentApprovalId: parent,
    reproposalVersion: version,
    createdAt: '2026-05-22T11:00:00Z',
    status: 'pending_user_approval',
    legs: [
      { legId: 'leg-1', instrument: 'CH0130595124', limitPrice: 129.50 + version * 0.05, status: 'pending_user_approval' },
    ],
    ...overrides,
  };
  fs.writeFileSync(file, JSON.stringify(envelope, null, 2));
  return file;
}

(async () => {
  const { root, reproposalDir } = fixture();

  // No reproposal: helper handles cleanly
  assert.strictEqual(latestReproposal({ portfolio: 'etf', parentApprovalId: 'b1', rootDir: root }), null);
  const noneResult = promoteReproposalToApproval({ portfolio: 'etf', parentApprovalId: 'b1', rootDir: root });
  assert.strictEqual(noneResult.ok, false);
  assert.strictEqual(noneResult.reason, 'no_reproposal_available');

  // Single reproposal: promote latest
  writeEnvelope(reproposalDir, 'basket-A', 1);
  const latest1 = latestReproposal({ portfolio: 'etf', parentApprovalId: 'basket-A', rootDir: root });
  assert.strictEqual(latest1.version, 1);

  const promoted = promoteReproposalToApproval({ portfolio: 'etf', parentApprovalId: 'basket-A', rootDir: root, now: '2026-05-22T11:30:00Z' });
  assert.strictEqual(promoted.ok, true);
  assert.strictEqual(promoted.alreadyPromoted, false);
  assert(fs.existsSync(promoted.path), 'approved envelope not created');
  const approved = JSON.parse(fs.readFileSync(promoted.path, 'utf8'));
  assert.strictEqual(approved.status, 'approved');
  assert.strictEqual(approved.approvedAt, '2026-05-22T11:30:00Z');
  assert.strictEqual(approved.approvalId, 'basket-A-reproposal-1');
  assert.strictEqual(approved.legs[0].status, 'approved', 'leg status must be promoted to approved');
  assert.strictEqual(approved.legs[0].limitPrice, 129.55, 'leg pricing must be preserved');
  assert(approved.promotedFrom.endsWith('basket-A-reproposal-1.json'), 'must record source path');

  // Idempotency: re-promote returns alreadyPromoted=true
  const repromoted = promoteReproposalToApproval({ portfolio: 'etf', parentApprovalId: 'basket-A', rootDir: root });
  assert.strictEqual(repromoted.ok, true);
  assert.strictEqual(repromoted.alreadyPromoted, true);
  assert.strictEqual(repromoted.path, promoted.path);

  // Multiple versions: latestReproposal picks the highest
  writeEnvelope(reproposalDir, 'basket-A', 2);
  writeEnvelope(reproposalDir, 'basket-A', 3);
  const latest3 = latestReproposal({ portfolio: 'etf', parentApprovalId: 'basket-A', rootDir: root });
  assert.strictEqual(latest3.version, 3);

  // Promote v3 explicitly
  const v3promoted = promoteReproposalToApproval({ portfolio: 'etf', parentApprovalId: 'basket-A', version: 3, rootDir: root });
  assert.strictEqual(v3promoted.ok, true);
  assert.strictEqual(v3promoted.alreadyPromoted, false);
  assert(v3promoted.path.endsWith('basket-A-reproposal-3.json'));
  const v3env = JSON.parse(fs.readFileSync(v3promoted.path, 'utf8'));
  assert.strictEqual(v3env.legs[0].limitPrice, 129.65);

  // Missing version: return reason
  const missing = promoteReproposalToApproval({ portfolio: 'etf', parentApprovalId: 'basket-A', version: 99, rootDir: root });
  assert.strictEqual(missing.ok, false);
  assert.strictEqual(missing.reason, 'reproposal_not_found');

  // Different parent in same dir: not picked up by latestReproposal
  writeEnvelope(reproposalDir, 'basket-B', 1);
  const aLatest = latestReproposal({ portfolio: 'etf', parentApprovalId: 'basket-A', rootDir: root });
  assert.strictEqual(aLatest.version, 3, 'cross-parent leakage detected');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
