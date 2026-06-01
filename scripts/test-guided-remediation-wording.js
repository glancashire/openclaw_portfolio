'use strict';

const assert = require('assert');
const { renderPortfolioSummaryMarkdown, renderCockpitPage } = require('../src/reporting/summaryArtifacts');
const { buildDashboardDigest } = require('../src/reporting/dashboardDigest');
const fs = require('fs');
const os = require('os');
const path = require('path');

const noopModelClient = {
  complete: async () => ({ content: [{ text: 'Mock assessment.' }] }),
};

function seed(repoRoot) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(path.join(repoRoot, 'config'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'config', 'report_delivery_policy.json'), JSON.stringify({ deliveryMode: 'repo_only' }, null, 2));
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [], acknowledgedBackfilledFills: [] }, null, 2));
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n- Date/time: 2026-05-23 06:00:00\n- Total value CHF: 10000\n- Cash CHF: 4000\n- Invested value CHF: 6000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate | Market value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| DEMO | Demo ETF | Equity | 10 | 600 | CHF | 1 | 6000 | 60 | 60 | 0 |\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-23 | end_of_day | 10000 | 6000 | 4000 | 50 | 0.5 | ok |\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
  return portfolioDir;
}

(async () => {
  const markdown = renderPortfolioSummaryMarkdown({
    portfolio: 'demo',
    generatedAt: '2026-05-23T17:00:00Z',
    status: { health: 'healthy', strategy: 'ok', brokerHealth: 'healthy', executionPosture: 'idle', deliveryPosture: 'ready', dataFreshness: 'fresh' },
    readiness: { ok: true, armedForMarketOpen: false, recommendedNextAction: 'No live action needed.' },
    selfHealPlan: { health: { nextAction: 'Review queue before acting.' } },
    explanations: {},
    holdings: {},
    operatorQueue: { summary: {} },
    contractIntelligence: {},
    approvals: {},
    execution: { tradeState: {}, openRunnerRetryState: {} },
    observability: { recentSummary: {} },
    allocation: [],
    instruments: [],
    recentMaterialEvents: [],
  });
  assert(markdown.includes('Guided remediation next step: Review queue before acting.'));
  assert(!markdown.includes('Self-heal dry-run next step:'));

  const cockpit = renderCockpitPage({
    dailySummary: { healthHeadline: 'healthy', biggestDrift: 'none' },
    approvalsQueue: {},
    reportHistory: {},
    summaries: [],
    deliveryOverview: {},
    cronHealth: { status: 'unavailable', message: 'Cron inspection unavailable.', jobs: [], total: 0, healthy: 0, failing: 0 },
    netLiqSparklineSvg: '',
  });
  assert(cockpit.includes('Cron Health (inspection unavailable)'));
  assert(cockpit.includes('Cron inspection unavailable.'));

  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'guided-remediation-wording-'));
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

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
