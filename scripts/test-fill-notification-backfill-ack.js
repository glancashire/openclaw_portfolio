const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadFillNotificationState, saveFillNotificationState, acknowledgeBackfilledFills } = require('../src/reporting/fillNotificationState');
const { reportDeliveryStatus } = require('../src/reporting/deliveryPolicy');

(function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fill-backfill-ack-'));
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify({ deliveryMode: 'email_and_repo', externalDeliveryEnabled: true, emailProvider: 'mailgun', emailRecipients: ['lancashire@swift.ch'], pendingActionThresholds: { staleDashboard: false, failedTrades: 99, inFlightOrders: 99, brokerAutomationPaused: false } }, null, 2));
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-05 11:05:00 | filled | buy | AAA | ETF A | 1 | 500 | 500 | 500 | note | broker_filled | 9107 |\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-05 | fill | 5000 | 1000 | 4000 | 0 | 0 | ok |\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');

  saveFillNotificationState(repoRoot, { notifiedFills: [], reconciledUnnotifiedFills: [9107], acknowledgedBackfilledFills: [] });
  const before = reportDeliveryStatus({ portfolioDir });
  assert.strictEqual(before.ready, false);
  assert(before.pendingActions.some((item) => /notification backfill review/i.test(item)));

  const next = acknowledgeBackfilledFills(loadFillNotificationState(repoRoot), [9107]);
  saveFillNotificationState(repoRoot, next);

  const afterState = loadFillNotificationState(repoRoot);
  assert.deepStrictEqual(afterState.reconciledUnnotifiedFills, []);
  assert.deepStrictEqual(afterState.acknowledgedBackfilledFills, [9107]);

  const after = reportDeliveryStatus({ portfolioDir });
  assert.strictEqual(after.pendingActions.some((item) => /notification backfill review/i.test(item)), false);

  console.log(JSON.stringify({ ok: true, afterState, pendingActions: after.pendingActions }, null, 2));
})();
