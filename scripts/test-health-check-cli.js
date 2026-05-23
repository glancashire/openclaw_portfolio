const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function seedPortfolio(repoRoot) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime', 'observability'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify({
    deliveryMode: 'local_only',
    intendedChannels: ['repo_artifacts'],
    externalDeliveryEnabled: false,
    emailProvider: 'mailgun',
    emailRecipients: [],
    pendingActionThresholds: { staleDashboard: false, failedTrades: 99, inFlightOrders: 99, brokerAutomationPaused: false },
  }, null, 2));
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [], acknowledgedBackfilledFills: [] }, null, 2));
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'observability', 'event-log.jsonl'), JSON.stringify({ at: '2026-05-23T08:00:00Z', kind: 'health_check', health: 'healthy', severity: 'low', blockerCount: 0 }) + '\n');
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n- Total value CHF: 5000\n- Cash CHF: 4000\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Price | Market value CHF | Allocation % | Target % | Drift % |\n|---|---|---:|---:|---:|---:|---:|---:|\n| DEMO | Demo ETF | 10 | 100 | 1000 | 20 | 20 | 0 |\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\nallocation after\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\nreport cycle snapshot\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n\n## Execution Plan\n\n- Total value: CHF 5000\n- Cash: CHF 4000\n');
  return portfolioDir;
}

(function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'health-check-cli-'));
  const portfolioDir = seedPortfolio(repoRoot);
  const output = execFileSync('node', ['scripts/run-health-check.js', portfolioDir, '--dry-run'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env },
  });
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.selfHeal.dryRun, true);
  assert(Array.isArray(parsed.selfHeal.classified));
  assert(Array.isArray(parsed.selfHeal.openIssues));
  assert(Array.isArray(parsed.selfHeal.operatorCommands));
  assert(parsed.artifacts.htmlPath.endsWith('health-report.html'));
  console.log(JSON.stringify({ ok: true }, null, 2));
})();
