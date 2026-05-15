const fs = require('fs');
const os = require('os');
const path = require('path');
const { reportDeliveryStatus, reportPendingActions } = require('../src/reporting/deliveryPolicy');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function seedPortfolio(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: require_confirmation\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 60 | 50 | 70 | SIX | CHF | |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n| none | none |\n\n## Allocation Targets\n| Asset class | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Global equities | 60 | 50 | 70 | |\n\n## Notes / Open Questions\n- settled\n`);
  fs.writeFileSync(path.join(dir, 'holdings.md'), `# Holdings\n\n## Last Sync\n- Date/time: 2026-05-05 11:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 4000\n- Invested value CHF: 1000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| AAA | ETF A | Global equities | 2 | 500 | CHF | 1 | 1000 | 20 | 50 | -30 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 4000 | 1 | 4000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n- Warnings:\n - none\n`);
  fs.writeFileSync(path.join(dir, 'trades.md'), `# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-05 11:05:00 | failed | buy | AAA | ETF A | 1 | 500 | 500 | 0 | note | broker_failed | 123 |\n`);
  fs.writeFileSync(path.join(dir, 'history.md'), `# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-05 | execution_failed | 5000 | 1000 | 4000 | 0 | 0 | Broker order 123 failed |\n`);
  fs.writeFileSync(path.join(dir, 'dashboard.md'), '# Dashboard\n');
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-delivery-'));
  const portfolioDir = path.join(tempDir, 'demo');
  seedPortfolio(portfolioDir);

  const staleFuture = new Date(Date.now() + 60_000);
  fs.utimesSync(path.join(portfolioDir, 'trades.md'), staleFuture, staleFuture);

  const status = reportDeliveryStatus({
    portfolioDir,
    generationMeta: { markdownWritten: true, pdfMode: 'stub', renderWarning: 'render mode stub' },
    workflow: [{ name: 'generate_report', ok: false, error: 'boom' }],
  });

  assert(status.deliveryMode === 'local_only', 'Expected local-only delivery mode');
  assert(status.externalDeliveryEnabled === false, 'Expected external delivery to stay disabled');
  assert(status.emailProvider === 'mailgun', 'Expected default email provider metadata');
  assert(Array.isArray(status.emailRecipients), 'Expected email recipient metadata array');
  assert(Array.isArray(status.pendingActions) && status.pendingActions.length >= 4, 'Expected pending actions to be surfaced');
  assert(status.ready === false, 'Expected readiness false with pending actions');
  assert(status.pendingActions.some((item) => /stale/i.test(item)), 'Expected stale warning');
  assert(status.pendingActions.some((item) => /failed/i.test(item)), 'Expected failed trade warning');
  assert(status.pendingActions.some((item) => /rendering used fallback/i.test(item)), 'Expected render fallback warning');
  assert(status.pendingActions.some((item) => /workflow step failed/i.test(item)), 'Expected workflow failure warning');

  const noPending = reportPendingActions({
    lifecycleSummary: { failed: 0, staged: 0, submitted: 0, partiallyFilled: 0 },
    freshness: { stale: false },
    brokerErrorState: { stopAutomation: false },
    generationMeta: { markdownWritten: true, pdfMode: 'pdf' },
    workflow: [{ name: 'generate_report', ok: true }],
    policy: { pendingActionThresholds: { staleDashboard: true, failedTrades: 1, inFlightOrders: 1, brokerAutomationPaused: true } },
  });
  assert(noPending.length === 0, 'Expected empty pending actions when healthy');

  console.log(JSON.stringify({ ok: true, status }, null, 2));
}

main();
