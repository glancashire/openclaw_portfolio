const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const dashboard = require('../src/reporting/dashboardGenerator');
const summaryArtifacts = require('../src/reporting/summaryArtifacts');

function extractRecommendedActions(modulePath) {
  const source = fs.readFileSync(modulePath, 'utf8');
  const match = source.match(/function recommendedActions\(existingTrades = \[\], latestProposals = \[\], totalValue = 0, brokerReadiness = null, lifecycleSummary = null(?:, allocations = \[\])?\) \{([\s\S]*?)\n\}/);
  if (!match) throw new Error(`recommendedActions not found in ${modulePath}`);
  // eslint-disable-next-line no-new-func
  return new Function('proposalSummary', `return function recommendedActions(existingTrades = [], latestProposals = [], totalValue = 0, brokerReadiness = null, lifecycleSummary = null, allocations = []) {${match[1]}\n}`)(
    (latestProposals, totalValue) => {
      const plannedCashSleeve = latestProposals
        .filter((proposal) => String(proposal.action || '').toLowerCase() === 'hold')
        .reduce((sum, proposal) => sum + Number(proposal.estimatedChf || proposal.amount || 0), 0);
      const executableBuys = latestProposals
        .filter((proposal) => String(proposal.action || '').toLowerCase() === 'buy')
        .reduce((sum, proposal) => sum + Number(proposal.estimatedChf || proposal.amount || 0), 0);
      const residualTradableCash = Number((totalValue - plannedCashSleeve - executableBuys).toFixed(2));
      return {
        plannedCashSleeve,
        executableBuys,
        residualTradableCash: residualTradableCash > 0 ? residualTradableCash : 0,
      };
    },
  );
}

(function main() {
  const dashboardRecommendedActions = extractRecommendedActions(path.join(__dirname, '..', 'src', 'reporting', 'dashboardGenerator.js'));
  const summaryRecommendedActions = extractRecommendedActions(path.join(__dirname, '..', 'src', 'reporting', 'summaryArtifacts.js'));

  const existingTrades = [
    { instrument: 'IE00B5BMR087', action: 'buy' },
    { instrument: 'CHF cash balance', action: 'hold' },
  ];
  const lifecycleSummary = { proposed: 0, approved: 0, staged: 0, submitted: 0, partiallyFilled: 0, filled: 4 };
  const brokerReadiness = { fallbackRequired: false };

  const dashboardRecommendations = dashboardRecommendedActions(existingTrades, [], 72274.25, brokerReadiness, lifecycleSummary);
  const summaryRecommendations = summaryRecommendedActions(existingTrades, [], 72274.25, brokerReadiness, lifecycleSummary);

  for (const recommendations of [dashboardRecommendations, summaryRecommendations]) {
    assert(recommendations[0], 'expected first recommendation');
    assert(!/dry-run instrument proposals/i.test(recommendations[0]), `unexpected stale dry-run wording: ${recommendations[0]}`);
    assert(/current allocation|live portfolio|cash sleeve|history snapshots/i.test(recommendations.join(' ')), `expected live-portfolio wording, got ${recommendations.join(' | ')}`);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-recommendation-hygiene-'));
  const tradesPath = path.join(tmpDir, 'trades.md');
  fs.writeFileSync(tradesPath, `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-28 13:17:00 | inactive | buy | CH0032912732 | UBS SLI ETF | 8 | 163.15 | 1305.20 | 0 | live submit | broker_inactive | 9138 | contract_resolution_failed | Broker rejected the order because the contract identity or venue resolution was not accepted. | 2026-05-28 13:17:02 | Verify conid, symbol, exchange, and primary exchange before retrying. |\n`);

  const suppressed = dashboard.buildPendingOperatorActions({
    tradesPath,
    holdingsText: '',
    deliveryStatus: { pendingActions: [] },
    brokerReadiness: { fallbackRequired: false },
    brokerErrorState: { stopAutomation: false },
    lifecycleSummary: { proposed: 0, approved: 0, staged: 0, submitted: 0, partiallyFilled: 0 },
    openRunnerRetryState: { queuedInitial: 0, queuedRetry: 0 },
    safetyDiagnostics: {},
    fillNotificationState: { notifiedFills: [], reconciledUnnotifiedFills: [] },
    recommended: [],
  });
  assert(!suppressed.some((item) => item.queueType === 'execution_block'), `expected stale contract_resolution_failed block to be suppressed, got ${JSON.stringify(suppressed, null, 2)}`);

  const preserved = dashboard.buildPendingOperatorActions({
    tradesPath,
    holdingsText: '',
    deliveryStatus: { pendingActions: [] },
    brokerReadiness: { fallbackRequired: false },
    brokerErrorState: { stopAutomation: false },
    lifecycleSummary: { proposed: 0, approved: 0, staged: 0, submitted: 1, partiallyFilled: 0 },
    openRunnerRetryState: { queuedInitial: 0, queuedRetry: 0 },
    safetyDiagnostics: {},
    fillNotificationState: { notifiedFills: [], reconciledUnnotifiedFills: [] },
    recommended: [],
  });
  assert(preserved.some((item) => item.queueType === 'execution_block'), `expected block to remain visible when orders are still in flight, got ${JSON.stringify(preserved, null, 2)}`);

  console.log(JSON.stringify({ ok: true, dashboardRecommendations, summaryRecommendations, suppressedCount: suppressed.length, preservedCount: preserved.length }, null, 2));
})();
