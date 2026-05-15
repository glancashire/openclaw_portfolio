const fs = require('fs');
const os = require('os');
const path = require('path');
const { reportDeliveryStatus } = require('../src/reporting/deliveryPolicy');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function seedPortfolio(repoRoot, portfolioName = 'demo') {
  const portfolioDir = path.join(repoRoot, 'portfolio', portfolioName);
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ${portfolioName}\n\n## Status\n- Status: active\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: transmitted_live\n`);
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-05 11:05:00 | filled | buy | AAA | ETF A | 1 | 500 | 500 | 500 | note | broker_filled | 9107 |\n`);
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-05 | fill | 5000 | 1000 | 4000 | 0 | 0 | ok |\n`);
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [9107], acknowledgedBackfilledFills: [] }, null, 2));
  return portfolioDir;
}

(function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-backfill-review-'));
  const portfolioDir = seedPortfolio(repoRoot);
  const status = reportDeliveryStatus({ portfolioDir });
  assert(status.ready === false, 'expected delivery readiness false when reconciled fill still needs backfill review');
  assert(Array.isArray(status.pendingActions) && status.pendingActions.some((item) => /notification backfill review/i.test(item)), 'expected backfill review pending action');
  assert(status.fillNotificationState && Array.isArray(status.fillNotificationState.reconciledUnnotifiedFills), 'expected fillNotificationState on delivery status');
  assert(status.fillNotificationState.reconciledUnnotifiedFills.length === 1, 'expected one reconciled unnotified fill');
  console.log(JSON.stringify({ ok: true, pendingActions: status.pendingActions }, null, 2));
})();
