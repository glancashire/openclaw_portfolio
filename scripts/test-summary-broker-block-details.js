const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  buildPortfolioSummaryModel,
  buildRecoveryChecklist,
  renderRecoveryChecklistMarkdown,
} = require('../src/reporting/summaryArtifacts');

(function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-broker-block-'));
  const tradesPath = path.join(tmpDir, 'trades.md');
  fs.writeFileSync(tradesPath, `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-11 09:40:00 | inactive | buy | IE000XZSV718 | SPYL | 105 | 15.5 | 1560.83 | 0 | live submit | broker_inactive | 9105 | exchange_closed_at_submit | Broker rejected the order because the target exchange was closed at submission time. | 2026-05-11 09:40:02 | Retry during the venue trading session or hand the row back to the market-open runner. |\n`);

  const summary = buildPortfolioSummaryModel({
    portfolioName: 'etf',
    tradesPath,
    holdingsText: `# Holdings\n- Date/time: 2026-05-11 10:00:00\n- Source: manual\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 10000\n- Cash CHF: 1000\n- Invested value CHF: 9000\n\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Market price | Market value CHF | Weight % | Notes |\n|---|---|---:|---:|---:|---:|---|\n| TEST | Test Holding | 1 | 1 | 1 | 0.01 | note |\n`,
    allocations: [],
    approvedInstruments: [],
    existingTrades: [],
    latestProposals: [],
    executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
    latestSnapshot: null,
    brokerReadiness: { fallbackRequired: false, message: 'healthy' },
    lifecycleSummary: { proposed: 0, approved: 1, staged: 0, submitted: 0, partiallyFilled: 0, failed: 0 },
    freshness: { stale: false },
    brokerErrorState: { stopAutomation: false },
    deliveryStatus: { ready: true, deliveryMode: 'none', failureAlertMode: 'none', pendingActions: [] },
    observability: { eventsPathPresent: false, recentSummary: { total: 0 } },
    safetyDiagnostics: { blockers: [] },
    recentEvents: [],
    readiness: null,
  });

  const recovery = buildRecoveryChecklist(summary);
  const markdown = renderRecoveryChecklistMarkdown(recovery);

  assert(Array.isArray(summary.execution.blockedRows), 'expected blockedRows array');
  assert.strictEqual(summary.execution.blockedRows.length, 1, `expected one blocked row, got ${summary.execution.blockedRows.length}`);
  assert.strictEqual(summary.execution.blockedRows[0].blockCode, 'exchange_closed_at_submit');
  assert(/exchange was closed at submission time/i.test(summary.execution.blockedRows[0].blockReason));

  assert(Array.isArray(recovery.activeBrokerBlocks), 'expected activeBrokerBlocks array');
  assert.strictEqual(recovery.activeBrokerBlocks.length, 1, `expected one active broker block, got ${recovery.activeBrokerBlocks.length}`);
  assert.strictEqual(recovery.activeBrokerBlocks[0].blockCode, 'exchange_closed_at_submit');

  assert(markdown.includes('## Active Broker Blocks'), 'expected recovery markdown section');
  assert(markdown.includes('exchange_closed_at_submit'), 'expected broker block code in recovery markdown');
  assert(markdown.includes('Retry during the venue trading session'), 'expected broker next action in recovery markdown');

  console.log(JSON.stringify({
    ok: true,
    blockedRows: summary.execution.blockedRows,
    activeBrokerBlocks: recovery.activeBrokerBlocks,
  }, null, 2));
})();
