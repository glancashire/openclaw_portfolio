const fs = require('fs');
const path = require('path');
const { analyzeAllocation } = require('../analysis/allocationAnalysis');
const { recentTrades, latestHistory } = require('./portfolioData');

function parseHoldingsSummary(text) {
  const get = (label) => {
    const m = text.match(new RegExp(`- ${label}:\\s*(.+)`));
    return m ? m[1].trim() : '0';
  };
  return {
    totalValue: get('Total value CHF'),
    cash: get('Cash CHF'),
    invested: get('Invested value CHF'),
    syncTime: get('Date/time'),
  };
}

function strategyStatus(allocations) {
  if (allocations.some((row) => row.status === 'out_of_bounds')) return 'rebalance_needed';
  if (allocations.some((row) => row.status === 'drifted')) return 'minor_drift';
  return 'on_track';
}

function formatAllocationRows(rows) {
  if (!rows.length) return '| <asset class> | 0 | 0 | 0 | blocked |';
  return rows.map((row) => `| ${row.assetClass} | ${row.current} | ${row.target} | ${row.drift} | ${row.status} |`).join('\n');
}

function generateDashboard({ portfolioName, holdingsText, allocations = [], existingTrades = [], latestSnapshot = null }) {
  const summary = parseHoldingsSummary(holdingsText);
  const tradeRows = existingTrades.length
    ? existingTrades.map((t) => `| ${t.date} | ${t.action} | ${t.instrument} | ${t.amount} | ${t.status} |`).join('\n')
    : '| YYYY-MM-DD | <action> | <instrument> | 0 | none |';

  const warnings = [
    '- Dashboard regeneration currently computes allocation drift at the asset-class level only.',
  ];
  if (latestSnapshot?.notes) warnings.push(`- Latest history note: ${latestSnapshot.notes}`);

  return `# Dashboard: ${portfolioName}\n\n## Summary\n- Total value: CHF ${summary.totalValue}\n- Cash: CHF ${summary.cash}\n- Invested: CHF ${summary.invested}\n- Number of holdings: <number>\n- Strategy status: ${strategyStatus(allocations)}\n- Last sync: ${summary.syncTime}\n- Last rebalance check: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}\n\n## Allocation vs Target\n| Asset class | Current % | Target % | Drift % | Status |\n|---|---:|---:|---:|---|\n${formatAllocationRows(allocations)}\n\n## Instrument Overview\n| Ticker / ISIN | Name | Value CHF | Current % | Target % | Drift % | Action |\n|---|---|---:|---:|---:|---:|---|\n\n## Recommended Actions\n1. Review recent trade proposals and approved instruments before generating instrument-level orders.\n2. Refresh history snapshots after holdings updates and trade execution.\n\n## Risk Warnings\n${warnings.join('\n')}\n\n## Recent Trades\n| Date | Action | Instrument | Amount CHF | Status |\n|---|---|---|---:|---|\n${tradeRows}\n`;
}

function regenerateDashboard(portfolioDir) {
  const portfolioName = path.basename(portfolioDir);
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const historyPath = path.join(portfolioDir, 'history.md');
  const dashboardPath = path.join(portfolioDir, 'dashboard.md');
  const holdingsText = fs.readFileSync(holdingsPath, 'utf8');
  const allocations = analyzeAllocation({ portfolioPath, holdingsPath });
  const dashboard = generateDashboard({
    portfolioName,
    holdingsText,
    allocations,
    existingTrades: recentTrades(tradesPath),
    latestSnapshot: latestHistory(historyPath),
  });
  fs.writeFileSync(dashboardPath, dashboard);
  return dashboardPath;
}

module.exports = { generateDashboard, regenerateDashboard };
