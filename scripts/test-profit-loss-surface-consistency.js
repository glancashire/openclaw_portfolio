'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { collectPortfolioSummary } = require('../src/reporting/summaryArtifacts');
const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');

(async function main() {
  const portfolioDir = path.join(__dirname, '..', 'portfolio', 'etf');
  const summary = await collectPortfolioSummary({ portfolioDir });
  const dashboardPath = await regenerateDashboard(portfolioDir);
  const dashboard = fs.readFileSync(dashboardPath, 'utf8');

  const profitMatch = dashboard.match(/- Total unrealized profit CHF: (.+)/);
  const pctMatch = dashboard.match(/- Total unrealized profit %: (.+)/);
  assert(profitMatch, 'Expected dashboard unrealized profit line');
  assert(pctMatch, 'Expected dashboard unrealized profit pct line');

  const expectedProfit = Number(summary.profitLoss.totals.totalProfitChf || 0);
  const expectedPct = summary.profitLoss.totals.totalProfitPct == null
    ? 'unknown'
    : `${Number(summary.profitLoss.totals.totalProfitPct) > 0 ? '+' : ''}${Number(summary.profitLoss.totals.totalProfitPct).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`;

  const normalizedDashboardProfit = Number(String(profitMatch[1]).replace(/[^0-9.-]/g, ''));
  assert.strictEqual(Number(normalizedDashboardProfit.toFixed(2)), Number(expectedProfit.toFixed(2)), `Expected dashboard profit ${expectedProfit}, got: ${profitMatch[1]}`);
  if (summary.profitLoss.totals.totalProfitPct == null) {
    assert.strictEqual(pctMatch[1], 'unknown');
  } else {
    const normalizedDashboardPct = Number(String(pctMatch[1]).replace(/[^0-9.-]/g, ''));
    const expectedPctNumeric = Number(summary.profitLoss.totals.totalProfitPct);
    assert.strictEqual(Number(normalizedDashboardPct.toFixed(2)), Number(expectedPctNumeric.toFixed(2)), `Expected dashboard pct ${expectedPctNumeric}, got: ${pctMatch[1]}`);
  }

  const row = summary.profitLoss.rows.find((item) => item.quoteSource || item.quoteQuality || item.quoteNote);
  assert(row, 'Expected at least one profit/loss row with quote provenance');
  assert(typeof row.quoteSource === 'string' && row.quoteSource.length > 0, 'Expected quoteSource');
  assert(typeof row.quoteQuality === 'string' && row.quoteQuality.length > 0, 'Expected quoteQuality');

  console.log(JSON.stringify({
    ok: true,
    totalProfitChf: summary.profitLoss.totals.totalProfitChf,
    totalProfitPct: summary.profitLoss.totals.totalProfitPct,
    quoteSource: row.quoteSource,
    quoteQuality: row.quoteQuality,
  }, null, 2));
})().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
