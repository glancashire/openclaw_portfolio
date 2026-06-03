const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildDashboardDigest } = require('../src/reporting/dashboardDigest');
const { createModelClient } = require('../lib/modelClient');

// Mock modelClient to prevent real network calls in tests
const noopModelClient = {
  complete: async () => ({ content: [{ text: 'Mock assessment.' }] }),
};

function seed(repoRoot) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify({
    deliveryMode: 'email_and_repo',
    intendedChannels: ['repo_artifacts', 'email'],
    externalDeliveryEnabled: true,
    emailProvider: 'mailgun',
    emailRecipients: ['digest@example.com'],
    pendingActionThresholds: { staleDashboard: false, failedTrades: 99, inFlightOrders: 99, brokerAutomationPaused: false },
  }, null, 2));
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [], acknowledgedBackfilledFills: [] }, null, 2));
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n\n## Allocation Targets\n| Sleeve | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Equity | 60 | 50 | 70 | core |\n| Cash | 40 | 30 | 50 | reserve |\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| DEMO | Demo ETF | Equity | 60 | 50 | 70 | SIX | CHF | core |\n| CASH-CHF | CHF cash balance | Cash | 40 | 30 | 50 | CASH | CHF | reserve |\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n- Date/time: 2026-05-23 06:00:00\n- Source: broker\n- Broker: ibkr\n- Base currency: CHF\n- Total value CHF: 10000\n- Cash CHF: 4000\n- Invested value CHF: 6000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate | Market value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| DEMO | Demo ETF | Equity | 10 | 600 | CHF | 1 | 6000 | 60 | 60 | 0 |\n| CASH-CHF | CHF cash balance | Cash | 4000 | 1 | CHF | 1 | 4000 | 40 | 40 | 0 |\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|\n| 2026-05-23 06:10:00 | proposed | buy | DEMO | Demo ETF | 1 | 600 | 600 | 0 | rebalance | pending |  |  |  | review |\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-20 | end_of_day | 9800 | 5800 | 4000 | 0 | 0 | ok |\n| 2026-05-21 | end_of_day | 9900 | 5900 | 4000 | 100 | 1.0 | ok |\n| 2026-05-22 | end_of_day | 9950 | 5950 | 4000 | 50 | 0.5 | ok |\n| 2026-05-23 | end_of_day | 10000 | 6000 | 4000 | 50 | 0.5 | ok |\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n\n## Execution Plan\n\n- Total value: CHF 10000\n- Cash: CHF 4000\n');
  return portfolioDir;
}

(async function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-digest-render-'));
  const portfolioDir = seed(repoRoot);
  const digest = await buildDashboardDigest({
    portfolioDir,
    frequency: 'weekly',
    generatedAt: '2026-05-23T17:00:00Z',
    modelClient: noopModelClient,
    cronHealth: {
      total: 2,
      healthy: 1,
      failing: 1,
      jobs: [
        { name: 'daily-sync', severity: 'ok', consecutiveErrors: 0, lastRunAgeHours: 1.2, lastError: null },
        { name: 'health-monitor', severity: 'warning', consecutiveErrors: 1, lastRunAgeHours: 2.5, lastError: 'telegram route missing' },
      ],
    },
  });

  assert.strictEqual(digest.subject, '[demo] Weekly portfolio digest — week of 2026-05-23');
  assert(digest.html.includes('OpenClaw Portfolio Digest'));
  assert(digest.html.includes('Portfolio performance'));
  assert(digest.html.includes('Portfolio trend'));
  // Allocation health line — either ✓ all on track, or ⚠ with count of off-track sleeves
  assert(digest.html.includes('All sleeves within target bands') || digest.html.includes('sleeve(s) off-track'));
  assert(digest.html.includes('Profit / Loss'));
  assert(digest.html.includes('Instrument health'));
  assert(digest.html.includes('Cron health'));
  assert(digest.html.includes('Next steps'));
  assert(digest.html.includes('max-width:720px'));
  // Redesigned digest no longer uses a gradient hero — confirm it's gone
  // and the new dark-mode-adaptive theme infrastructure is present instead.
  assert(!digest.html.includes('linear-gradient(135deg'), 'No gradient hero (replaced with clean header)');
  assert(digest.html.includes('color-scheme'), 'Has color-scheme meta');
  assert(digest.html.includes('[data-ogsc]'), 'Has Outlook force-light hooks');
  assert(digest.html.includes('class="t-page'), 'Has theme class hooks');
  assert(digest.html.includes('health-monitor'));
  assert(digest.text.includes('Cron health: 1/2 healthy, 1 failing'));
  assert(digest.text.includes('Portfolio value (incl cash):'));
  assert(digest.text.includes('Unrealized profit:'));
  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});


(async function unavailableCronMain() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-digest-render-unavail-'));
  const portfolioDir = seed(repoRoot);
  const digest = await buildDashboardDigest({
    portfolioDir,
    frequency: 'daily',
    generatedAt: '2026-05-23T17:00:00Z',
    modelClient: noopModelClient,
    cronHealth: { status: 'unavailable', total: 0, healthy: 0, failing: 0, jobs: [], message: 'Cron inspection unavailable.' },
  });

  assert(digest.html.includes('Cron inspection unavailable.'));
  assert(digest.text.includes('Cron health: unavailable'));
  console.log(JSON.stringify({ ok: true, unavailableCron: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
