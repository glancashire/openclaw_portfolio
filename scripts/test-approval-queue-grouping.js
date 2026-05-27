'use strict';

/* Phase W8 — approval queue grouping + explanations.
 *
 * Verifies:
 *   - actionable group: fresh proposals, basket-approved, latest reproposals
 *   - stale group: stale_needs_reapproval rows surfaced as row-level items
 *   - superseded group: older reproposal versions marked superseded with a
 *     pointer to the newer version
 *   - every item carries a non-empty `explanation`
 *   - markdown renders three group headings
 *   - JSON output includes `groups` summary with correct counts
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildApprovalsQueue, renderApprovalsQueueMarkdown } = require('../src/reporting/summaryArtifacts');

function writeReproposal(dir, name, envelope) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(envelope, null, 2));
}

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-queue-grouping-'));
  const reproposalDir = path.join(tempRoot, 'runtime', 'basket-reproposals', 'etf');

  // Two reproposal versions for the same parent → newest is actionable, older is superseded.
  writeReproposal(reproposalDir, 'parent-A__v1.json', {
    parentApprovalId: 'parent-A',
    reproposalVersion: 1,
    approvalId: 'parent-A__v1',
    createdAt: '2026-05-25T08:00:00Z',
    legs: [{ ibkrSymbol: 'EMUAA', action: 'BUY', quantity: 1, limitPrice: 38.0, currency: 'EUR' }],
  });
  writeReproposal(reproposalDir, 'parent-A__v2.json', {
    parentApprovalId: 'parent-A',
    reproposalVersion: 2,
    approvalId: 'parent-A__v2',
    createdAt: '2026-05-26T08:00:00Z',
    legs: [{ ibkrSymbol: 'EMUAA', action: 'BUY', quantity: 1, limitPrice: 38.5, currency: 'EUR' }],
  });

  const summary = {
    portfolio: 'etf',
    operatorQueue: {
      items: [
        // Fresh proposal — actionable.
        {
          queueType: 'approval',
          kind: 'approval',
          severity: 'medium',
          status: 'pending_user_approval',
          summary: '3 proposed trade row(s) still need user approval.',
          recommendedOperatorAction: 'Review the proposed trades and approve or reject them explicitly.',
        },
        // Aggregate stale-approval summary — should be suppressed (replaced by row-level items).
        {
          queueType: 'approval',
          kind: 'approval',
          severity: 'high',
          status: 'stale_needs_reapproval',
          summary: '1 approved trade row(s) need fresh approval before live submission.',
        },
      ],
    },
    approvals: {
      staleApprovals: [
        {
          rowIndex: 0,
          dateTime: '2026-05-23 08:00:00',
          tickerOrIsin: 'AAA',
          name: 'ETF A',
          action: 'buy',
          status: 'approved',
          approval: 'user_approved',
          approvalAgeHours: 72.5,
          reasonCode: 'stale_approval',
          reason: 'Approval is stale at 72.50h.',
          refreshCommand: 'node scripts/trade.js propose portfolio/etf',
          reapproveGuidance: 'Approve only the latest regenerated row for this instrument/action after reviewing the refreshed proposal.',
        },
      ],
    },
  };

  const queue = buildApprovalsQueue([summary], { rootDir: tempRoot });

  // ── 1) every item has non-empty explanation ──
  for (const item of queue.items) {
    assert(typeof item.explanation === 'string' && item.explanation.length > 0,
      `expected non-empty explanation on item rank ${item.rank}: ${JSON.stringify(item)}`);
    assert(typeof item.group === 'string' && item.group.length > 0,
      `expected group on item rank ${item.rank}`);
  }

  // ── 2) groups summary present and correct ──
  assert(queue.groups, 'expected groups object on queue');
  assert.strictEqual(queue.groups.actionable.count, 2, `actionable count expected 2 (proposed + reproposal v2), got ${queue.groups.actionable.count}`);
  assert.strictEqual(queue.groups.stale.count, 1, `stale count expected 1, got ${queue.groups.stale.count}`);
  assert.strictEqual(queue.groups.superseded.count, 1, `superseded count expected 1 (reproposal v1), got ${queue.groups.superseded.count}`);
  assert.strictEqual(queue.itemCount, 4);

  // ── 3) sort order: actionable first, stale next, superseded last ──
  const groupSequence = queue.items.map((it) => it.group);
  const firstStaleIdx = groupSequence.indexOf('stale');
  const firstSupersededIdx = groupSequence.indexOf('superseded');
  const lastActionableIdx = groupSequence.lastIndexOf('actionable');
  assert(lastActionableIdx < firstStaleIdx, 'actionable should precede stale');
  assert(firstStaleIdx < firstSupersededIdx, 'stale should precede superseded');

  // ── 4) actionable group includes both fresh proposal and latest reproposal v2 ──
  const actionable = queue.items.filter((it) => it.group === 'actionable');
  assert(actionable.some((it) => it.status === 'pending_user_approval'
    && /Fresh proposal within the approval window/.test(it.explanation)),
    'expected fresh proposal explanation');
  assert(actionable.some((it) => it.kind === 'basket_reproposal_pending' && it.reproposalVersion === 2),
    'expected reproposal v2 in actionable group');

  // ── 5) stale group surfaces row-level item with hour-based explanation ──
  const stale = queue.items.filter((it) => it.group === 'stale');
  assert.strictEqual(stale.length, 1);
  assert.strictEqual(stale[0].status, 'stale_needs_reapproval');
  assert.strictEqual(stale[0].tickerOrIsin, 'AAA');
  assert(/72\.5h/.test(stale[0].explanation),
    `expected hour-based explanation, got: ${stale[0].explanation}`);
  assert(/refresh approval before live submission/i.test(stale[0].explanation));
  assert(/refresh-stale-approvals|refresh/i.test(stale[0].recommendedOperatorAction));

  // ── 6) superseded group: older v1 marked, points forward to v2 ──
  const superseded = queue.items.filter((it) => it.group === 'superseded');
  assert.strictEqual(superseded.length, 1);
  const supItem = superseded[0];
  assert.strictEqual(supItem.reproposalVersion, 1);
  assert.strictEqual(supItem.supersededByVersion, 2);
  assert(/Superseded by reproposal v2/i.test(supItem.explanation),
    `expected superseded explanation pointing to v2, got: ${supItem.explanation}`);
  assert(/approve the newer/i.test(supItem.explanation),
    'expected guidance to approve newer row');
  assert(/v2/i.test(supItem.recommendedOperatorAction),
    'expected recommendedOperatorAction to mention v2');

  // ── 7) markdown renders all three group headings ──
  const md = renderApprovalsQueueMarkdown(queue);
  assert(md.includes('## Actionable now'), 'missing "Actionable now" heading');
  assert(md.includes('## Stale / needs refresh'), 'missing "Stale / needs refresh" heading');
  assert(md.includes('## Regenerated (superseded)'), 'missing "Regenerated (superseded)" heading');
  assert(md.includes('Superseded by reproposal v2'), 'missing superseded explanation in markdown');
  assert(/Stale: 1/.test(md), 'expected stale count in markdown summary');
  assert(/Superseded: 1/.test(md), 'expected superseded count in markdown summary');

  // ── 8) backward compatibility: queue.items still flat array, ranks contiguous ──
  queue.items.forEach((item, idx) => {
    assert.strictEqual(item.rank, idx + 1, `expected rank ${idx + 1}, got ${item.rank}`);
  });

  // ── 9) empty queue still works (no rootDir, no summary state) ──
  const emptyQueue = buildApprovalsQueue([{ portfolio: 'etf', operatorQueue: { items: [] } }]);
  assert.strictEqual(emptyQueue.itemCount, 0);
  assert(emptyQueue.groups);
  const emptyMd = renderApprovalsQueueMarkdown(emptyQueue);
  assert(/No pending approval items/.test(emptyMd), 'empty queue placeholder preserved');

  // cleanup tmp
  fs.rmSync(tempRoot, { recursive: true, force: true });

  console.log(JSON.stringify({ ok: true, itemCount: queue.itemCount, groups: {
    actionable: queue.groups.actionable.count,
    stale: queue.groups.stale.count,
    superseded: queue.groups.superseded.count,
  } }));
}

main();
