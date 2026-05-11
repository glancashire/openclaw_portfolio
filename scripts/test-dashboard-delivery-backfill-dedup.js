const assert = require('assert');
const { buildPendingOperatorActions } = require('../src/reporting/dashboardGenerator');

(function main() {
  const actions = buildPendingOperatorActions({
    deliveryStatus: {
      pendingActions: [
        '1 reconciled fill(s) still need notification backfill review.',
        'Dashboard/report freshness is stale relative to source state.',
      ],
    },
    lifecycleSummary: { approved: 0, proposed: 0, submitted: 0, partiallyFilled: 0, staged: 0 },
    openRunnerRetryState: { queuedInitial: 0, queuedRetry: 0 },
    fillNotificationState: { notifiedFills: [], reconciledUnnotifiedFills: [9107] },
    recommended: [],
  });

  const backfillItems = actions.filter((item) => /notification backfill review/i.test(item.summary));
  assert.strictEqual(backfillItems.length, 1, `expected one backfill action after dedupe, got ${backfillItems.length}`);
  assert.strictEqual(backfillItems[0].status, 'backfill_review', `expected typed backfill_review status, got ${backfillItems[0].status}`);
  assert(actions.some((item) => /freshness is stale/i.test(item.summary)), 'expected unrelated delivery pending action to remain');
  console.log(JSON.stringify({ ok: true, actions }, null, 2));
})();
