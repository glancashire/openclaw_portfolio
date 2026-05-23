const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function seed(repoRoot) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'etf');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify({
    deliveryMode: 'email_and_repo',
    intendedChannels: ['repo_artifacts', 'email'],
    externalDeliveryEnabled: true,
    emailProvider: 'mailgun',
    emailRecipients: [],
    pendingActionThresholds: { staleDashboard: false, failedTrades: 99, inFlightOrders: 99, brokerAutomationPaused: false },
  }, null, 2));
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [], acknowledgedBackfilledFills: [] }, null, 2));
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: etf\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| DEMO | Demo ETF | Equity | 100 | 90 | 100 | SIX | CHF | core |\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n- Date/time: 2026-05-23 06:00:00\n- Source: broker\n- Broker: ibkr\n- Base currency: CHF\n- Total value CHF: 10000\n- Cash CHF: 0\n- Invested value CHF: 10000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate | Market value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| DEMO | Demo ETF | Equity | 10 | 1000 | CHF | 1 | 10000 | 100 | 100 | 0 |\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-23 | end_of_day | 10000 | 10000 | 0 | 0 | 0 | ok |\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
}

(function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-digest-cli-'));
  seed(repoRoot);
  const scriptPath = path.resolve(__dirname, 'send-dashboard-digest.js');
  const output = execFileSync('node', [scriptPath, '--portfolio=etf', '--frequency=daily', '--dry-run'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, MAILGUN_RECIPIENT: 'cli@example.com' },
  });
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.dryRun, true);
  assert.strictEqual(parsed.frequency, 'daily');
  assert.strictEqual(parsed.subject, '[etf] Daily portfolio digest — ' + new Date().toISOString().slice(0, 10));
  assert.deepStrictEqual(parsed.recipients, ['cli@example.com']);
  console.log(JSON.stringify({ ok: true }, null, 2));
})();
