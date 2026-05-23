const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runHealthCheck } = require('../src/reporting/healthReport');

function seedPortfolio(repoRoot) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify({
    deliveryMode: 'email_and_repo',
    intendedChannels: ['repo_artifacts', 'email'],
    externalDeliveryEnabled: true,
    emailProvider: 'mailgun',
    emailRecipients: ['lancashire@swift.ch'],
    pendingActionThresholds: { staleDashboard: false, failedTrades: 99, inFlightOrders: 99, brokerAutomationPaused: false },
  }, null, 2));
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [], acknowledgedBackfilledFills: [] }, null, 2));
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n- Total value CHF: 5000\n- Cash CHF: 4000\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Price | Market value CHF | Allocation % | Target % | Drift % |\n|---|---|---:|---:|---:|---:|---:|---:|\n| DEMO | Demo ETF | 10 | 100 | 1000 | 20 | 20 | 0 |\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\nallocation after\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\nreport cycle snapshot\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n\n## Execution Plan\n\n- Total value: CHF 5000\n- Cash: CHF 4000\n');
  return portfolioDir;
}

(async function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'health-report-runner-'));
  const portfolioDir = seedPortfolio(repoRoot);
  const { report, artifacts } = await runHealthCheck({ portfolioDir, repoRoot, applySafeFixes: false });
  assert(report);
  assert(report.before);
  assert(report.after);
  assert(report.health);
  assert(Array.isArray(report.selfHeal.classified));
  assert(Array.isArray(report.selfHeal.openIssues));
  assert(fs.existsSync(artifacts.jsonPath));
  assert(fs.existsSync(artifacts.mdPath));
  assert(fs.existsSync(artifacts.htmlPath));
  assert(artifacts.html.includes('system health report'));
  assert(artifacts.html.includes('Classified symptoms'));
  assert(artifacts.html.includes('Open issues for operator'));
  assert(fs.existsSync(path.join(repoRoot, 'runtime', 'observability', 'event-log.jsonl')));
  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
