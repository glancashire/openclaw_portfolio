const assert = require('assert');
const { bestNextStep } = require('../src/reporting/dashboardGenerator');

(function main() {
  const result = bestNextStep({
    pendingActions: [
      { queueType: 'open_runner_retry', status: 'ready_for_review', severity: 'medium', summary: '1 trade row(s) were requeued for market-open retry after operator recovery.' },
      { queueType: 'approval', status: 'ready_for_review', severity: 'medium', summary: 'There are 1 approved trade row(s) ready for staging/review.' },
      { queueType: 'delivery', status: 'backfill_review', severity: 'medium', summary: '1 reconciled fill(s) were detected after the live window and still need notification backfill review.' },
    ],
    blockers: [],
    recommendedActionsList: [],
    brokerReadiness: { fallbackRequired: false },
    lifecycleSummary: { approved: 1 },
  });

  assert(result && result.queueType === 'approval', `expected approval item prioritized ahead of delivery cleanup, got ${JSON.stringify(result)}`);
  assert(result.status === 'ready_for_review', `expected ready_for_review status, got ${result.status}`);
  console.log(JSON.stringify({ ok: true, bestNextStep: result }, null, 2));
})();
