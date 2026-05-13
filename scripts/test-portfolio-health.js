const assert = require('assert');
const { classifyPortfolioHealth } = require('../src/execution/portfolioHealth');

(function main() {
  const paused = classifyPortfolioHealth({
    brokerReadiness: { fallbackRequired: true, message: 'gateway down', reachable: false },
    errorState: { stopAutomation: true, consecutive: 3 },
    staleApprovedRows: [{ ticker: 'AAA' }],
    retryState: { queuedInitial: 0, queuedRetry: 1 },
    deliveryStatus: { pendingActions: ['delivery backlog'] },
    fillNotificationState: { reconciledUnnotifiedFills: [9107] },
  });
  assert.strictEqual(paused.health, 'paused');
  assert.strictEqual(paused.severity, 'high');
  assert(paused.blockers.some((entry) => entry.code === 'broker_automation_paused'));
  assert(paused.blockers.some((entry) => entry.code === 'broker_unready'));
  assert(paused.recommendedActions.some((entry) => /fresh proposal row/i.test(entry)));

  const healthy = classifyPortfolioHealth({
    brokerReadiness: { fallbackRequired: false, reachable: true, authenticated: true, message: 'ok' },
    errorState: { stopAutomation: false, consecutive: 0 },
    staleApprovedRows: [],
    retryState: { queuedInitial: 0, queuedRetry: 0 },
    deliveryStatus: { pendingActions: [] },
    fillNotificationState: { reconciledUnnotifiedFills: [] },
  });
  assert.strictEqual(healthy.health, 'healthy');
  assert.strictEqual(healthy.blockerCount, 0);
  console.log(JSON.stringify({ ok: true }, null, 2));
})();
