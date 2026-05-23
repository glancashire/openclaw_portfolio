const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generatePortfolioSummaryArtifacts } = require('../src/reporting/summaryArtifacts');
const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');
const { generateOverviewBoard } = require('../src/reporting/overviewBoard');

function seedPortfolio(repoRoot) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime', 'overview'), { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---:|---:|---:|---:|---|---|---|\n| DEMO | Demo ETF | Equity | 60 | 50 | 70 | SIX | CHF | core |\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n- Date/time: 2026-05-23 06:00:00\n- Source: broker\n- Broker: ibkr\n- Base currency: CHF\n- Total value CHF: 10000\n- Cash CHF: 4000\n- Invested value CHF: 6000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate | Market value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| DEMO | Demo ETF | Equity | 10 | 600 | CHF | 1 | 6000 | 60 | 60 | 0 |\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-23 06:10:00 | proposed | buy | DEMO | Demo ETF | 1 | 600 | 600 | 0 | rebalance | pending |  |\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-23 | end_of_day | 10000 | 6000 | 4000 | 50 | 0.5 | ok |\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'events'), '');
  return portfolioDir;
}

(async function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'resting-state-'));
  const portfolioDir = seedPortfolio(repoRoot);

  const firstSummary = await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles: true });
  const summaryBefore = fs.readFileSync(firstSummary.outPath, 'utf8');
  const htmlBefore = fs.readFileSync(firstSummary.htmlPath, 'utf8');
  const firstDashboard = await regenerateDashboard(portfolioDir);
  const dashboardBefore = fs.readFileSync(firstDashboard, 'utf8');
  const firstOverview = await generateOverviewBoard({ repoRoot, writeFiles: true });
  const overviewBefore = fs.readFileSync(firstOverview.markdownPath, 'utf8');

  await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles: true });
  await regenerateDashboard(portfolioDir);
  await generateOverviewBoard({ repoRoot, writeFiles: true });

  assert.strictEqual(fs.readFileSync(firstSummary.outPath, 'utf8'), summaryBefore);
  assert.strictEqual(fs.readFileSync(firstSummary.htmlPath, 'utf8'), htmlBefore);
  assert.strictEqual(fs.readFileSync(firstDashboard, 'utf8'), dashboardBefore);
  assert.strictEqual(fs.readFileSync(firstOverview.markdownPath, 'utf8'), overviewBefore);

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
