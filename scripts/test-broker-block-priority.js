const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildPendingOperatorActions, bestNextStep } = require('../src/reporting/dashboardGenerator');

(function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'broker-block-priority-'));
  const tradesPath = path.join(tmpDir, 'trades.md');
  fs.writeFileSync(tradesPath, `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-11 09:40:00 | inactive | buy | IE000XZSV718 | SPYL | 105 | 15.5 | 1560.83 | 0 | live submit | broker_inactive | 9105 | exchange_closed_at_submit | Broker rejected the order because the target exchange was closed at submission time. | 2026-05-11 09:40:02 | Retry during the venue trading session or hand the row back to the market-open runner. |\n`);

  const pendingActions = buildPendingOperatorActions({
    tradesPath,
    deliveryStatus: { pendingActions: [] },
    brokerReadiness: { fallbackRequired: false },
    brokerErrorState: { stopAutomation: false },
    lifecycleSummary: { approved: 1, proposed: 0, submitted: 0, partiallyFilled: 0, staged: 0 },
    openRunnerRetryState: { queuedInitial: 0, queuedRetry: 1 },
    safetyDiagnostics: {},
    fillNotificationState: { notifiedFills: [], reconciledUnnotifiedFills: [] },
    recommended: [],
  });

  const blocked = pendingActions.find((item) => item.queueType === 'execution_block');
  assert(blocked, `expected execution_block queue item, got ${JSON.stringify(pendingActions, null, 2)}`);
  assert.strictEqual(blocked.status, 'blocked');
  assert(/exchange was closed at submission time/i.test(blocked.summary));
  assert(/market-open runner|venue trading session/i.test(blocked.recommendedOperatorAction));

  const best = bestNextStep({
    pendingActions,
    blockers: [],
    recommendedActionsList: [],
    brokerReadiness: { fallbackRequired: false },
    lifecycleSummary: { approved: 1 },
  });
  assert(best && best.queueType === 'execution_block', `expected execution_block best next step, got ${JSON.stringify(best)}`);

  const withBackfill = bestNextStep({
    pendingActions: [
      ...pendingActions,
      { queueType: 'delivery', status: 'backfill_review', severity: 'medium', summary: '1 reconciled fill still needs notification backfill review.' },
    ],
    blockers: [],
    recommendedActionsList: [],
    brokerReadiness: { fallbackRequired: false },
    lifecycleSummary: { approved: 1 },
  });
  assert(withBackfill && withBackfill.queueType === 'execution_block', `expected execution block to outrank delivery backfill, got ${JSON.stringify(withBackfill)}`);

  console.log(JSON.stringify({ ok: true, blocked, best, withBackfill }, null, 2));
})();
