const fs = require('fs');
const path = require('path');

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

function generateDashboard({ portfolioName, holdingsText, existingTrades = [] }) {
  const summary = parseHoldingsSummary(holdingsText);
  const tradeRows = existingTrades.length
    ? existingTrades.map((t) => `| ${t.date} | ${t.action} | ${t.instrument} | ${t.amount} | ${t.status} |`).join('\n')
    : '| YYYY-MM-DD | <action> | <instrument> | 0 | none |';

  return `# Dashboard: ${portfolioName}\n\n## Summary\n- Total value: CHF ${summary.totalValue}\n- Cash: CHF ${summary.cash}\n- Invested: CHF ${summary.invested}\n- Number of holdings: <number>\n- Strategy status: blocked\n- Last sync: ${summary.syncTime}\n- Last rebalance check: YYYY-MM-DD HH:mm:ss\n\n## Allocation vs Target\n| Asset class | Current % | Target % | Drift % | Status |\n|---|---:|---:|---:|---|\n\n## Instrument Overview\n| Ticker / ISIN | Name | Value CHF | Current % | Target % | Drift % | Action |\n|---|---|---:|---:|---:|---:|---|\n\n## Recommended Actions\n1. Run allocation and drift analysis once approved instruments and synced holdings are available.\n2. Review data quality warnings before proposing trades.\n\n## Risk Warnings\n- Dashboard regeneration is currently summary-first and does not yet compute allocation math.\n\n## Recent Trades\n| Date | Action | Instrument | Amount CHF | Status |\n|---|---|---|---:|---|\n${tradeRows}\n`;
}

function regenerateDashboard(portfolioDir) {
  const portfolioName = path.basename(portfolioDir);
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const dashboardPath = path.join(portfolioDir, 'dashboard.md');
  const holdingsText = fs.readFileSync(holdingsPath, 'utf8');
  const dashboard = generateDashboard({ portfolioName, holdingsText });
  fs.writeFileSync(dashboardPath, dashboard);
  return dashboardPath;
}

module.exports = { generateDashboard, regenerateDashboard };
