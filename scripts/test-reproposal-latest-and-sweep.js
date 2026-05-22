'use strict';

/* Phase 194 — listLatestPendingReproposals + sweepSupersededReproposals tests. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { listPendingReproposals, listLatestPendingReproposals } = require('../src/reporting/reproposalSurface');
const { sweepSupersededReproposals } = require('../src/execution/basketReproposalArchiver');
const { buildReproposalForCancelledLegs } = require('../src/execution/basketReproposalBuilder');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rep194-'));
  const reproposalDir = path.join(root, 'runtime', 'basket-reproposals', 'etf');
  const approvedDir = path.join(root, 'runtime', 'approved-order-baskets', 'etf');
  fs.mkdirSync(reproposalDir, { recursive: true });
  fs.mkdirSync(approvedDir, { recursive: true });
  return { root, reproposalDir, approvedDir };
}

function writeRep(dir, parent, version, legs = []) {
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
  const { root, reproposalDir } = fixture();

  // Empty case: latest list is empty
  assert.deepStrictEqual(listLatestPendingReproposals({ rootDir: root, portfolio: 'etf' }), []);

  // Single version: latest === all
  writeRep(reproposalDir, 'parent-A', 1);
  let latest = listLatestPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(latest.length, 1);
  assert.strictEqual(latest[0].version, 1);

  // Multiple versions: latest collapses to max
  writeRep(reproposalDir, 'parent-A', 2);
  writeRep(reproposalDir, 'parent-A', 3);
  writeRep(reproposalDir, 'parent-B', 1);
  writeRep(reproposalDir, 'parent-B', 2);

  const all = listPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(all.length, 5);

  latest = listLatestPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(latest.length, 2);
  const byParent = new Map(latest.map((r) => [r.parentApprovalId, r.version]));
  assert.strictEqual(byParent.get('parent-A'), 3);
  assert.strictEqual(byParent.get('parent-B'), 2);

  // Sweep: archive parent-A v1, v2 and parent-B v1
  const sweep = sweepSupersededReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(sweep.archived.length, 3, `expected 3 archived, got ${sweep.archived.length}`);
  const archivedDir = path.join(reproposalDir, '.superseded');
  assert(fs.existsSync(archivedDir), 'archive directory missing');
  const archivedNames = fs.readdirSync(archivedDir).sort();
  assert.deepStrictEqual(archivedNames, ['parent-A-reproposal-1.json', 'parent-A-reproposal-2.json', 'parent-B-reproposal-1.json']);

  // Active dir now contains only the latest per parent + the .superseded subdir
  const activeNames = fs.readdirSync(reproposalDir).filter((n) => n.endsWith('.json')).sort();
  assert.deepStrictEqual(activeNames, ['parent-A-reproposal-3.json', 'parent-B-reproposal-2.json']);

  // listPendingReproposals must not include archived items
  const post = listPendingReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(post.length, 2);

  // Idempotent: re-running sweep is a no-op
  const sweep2 = sweepSupersededReproposals({ rootDir: root, portfolio: 'etf' });
  assert.strictEqual(sweep2.archived.length, 0);

  // dryRun: archives nothing on disk but reports what would be archived
  writeRep(reproposalDir, 'parent-A', 4);
  const dryResult = sweepSupersededReproposals({ rootDir: root, portfolio: 'etf', dryRun: true });
  assert.strictEqual(dryResult.archived.length, 1, 'dry-run should still report archives');
  assert(fs.existsSync(path.join(reproposalDir, 'parent-A-reproposal-3.json')), 'dry-run must not move files');

  // Build flow: creating a new reproposal auto-archives prior un-promoted versions
  const { root: r2, reproposalDir: rd2, approvedDir: ad2 } = fixture();
  writeRep(rd2, 'parent-X', 1);
  writeRep(rd2, 'parent-X', 2);
  // build a new reproposal v3 for the same parent
  const runState = { legs: { 'leg-1': { legId: 'leg-1', instrument: 'CH0130595124', status: 'cancelled', conid: '91639399' } } };
  const original = { legs: [{ legId: 'leg-1', instrument: 'CH0130595124', limitPrice: 130.00, currency: 'CHF' }] };
  const result = await buildReproposalForCancelledLegs({
    portfolio: 'etf',
    approvalId: 'parent-X',
    runState,
    originalEnvelope: original,
    quoteFn: async () => ({ ask: NaN, lastClose: 130.00 }),
    rootDir: r2,
  });
  assert.strictEqual(result.skipped, false);
  // After build: only the newest version remains in active dir, prior versions archived
  const activeAfter = fs.readdirSync(rd2).filter((n) => n.endsWith('.json')).sort();
  assert.strictEqual(activeAfter.length, 1, `expected 1 active reproposal, got ${activeAfter.length}: ${activeAfter}`);
  assert(activeAfter[0].endsWith(`-reproposal-${result.version}.json`));
  const archivedAfter = fs.existsSync(path.join(rd2, '.superseded')) ? fs.readdirSync(path.join(rd2, '.superseded')) : [];
  assert.strictEqual(archivedAfter.length, 2, `expected 2 archived, got ${archivedAfter.length}`);
  assert(Array.isArray(result.archived) && result.archived.length === 2, 'builder must report archived items');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
