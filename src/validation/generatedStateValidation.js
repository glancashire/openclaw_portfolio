const fs = require('fs');
const path = require('path');

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function extractNumber(text, label) {
  const match = text.match(new RegExp(`- ${label}:\\s*(.+)`));
  if (!match) return null;
  const value = Number(String(match[1]).replace(/[ ,]/g, '').trim());
  return Number.isFinite(value) ? value : null;
}

function validateGeneratedState(portfolioDir) {
  const issues = [];
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const dashboardPath = path.join(portfolioDir, 'dashboard.md');
  const historyPath = path.join(portfolioDir, 'history.md');
  const reportsDir = path.join(portfolioDir, 'reports');

  const holdings = read(holdingsPath);
  const trades = read(tradesPath);
  const dashboard = read(dashboardPath);
  const history = read(historyPath);

  const holdingsTotal = extractNumber(holdings, 'Total value CHF');
  const holdingsCash = extractNumber(holdings, 'Cash CHF');
  const dashboardTotalMatch = dashboard.match(/- Total value: CHF\s*(.+)/);
  const dashboardCashMatch = dashboard.match(/- Cash: CHF\s*(.+)/);
  const dashboardTotal = dashboardTotalMatch ? Number(String(dashboardTotalMatch[1]).replace(/[ ,]/g, '').trim()) : null;
  const dashboardCash = dashboardCashMatch ? Number(String(dashboardCashMatch[1]).replace(/[ ,]/g, '').trim()) : null;

  if (holdingsTotal != null && dashboardTotal != null && holdingsTotal !== dashboardTotal) {
    issues.push({ severity: 'warning', message: `Dashboard total CHF ${dashboardTotal} does not match holdings total CHF ${holdingsTotal}.` });
  }
  if (holdingsCash != null && dashboardCash != null && holdingsCash !== dashboardCash) {
    issues.push({ severity: 'warning', message: `Dashboard cash CHF ${dashboardCash} does not match holdings cash CHF ${holdingsCash}.` });
  }
  if (!/## Execution Plan/.test(dashboard)) {
    issues.push({ severity: 'warning', message: 'Dashboard is missing Execution Plan section.' });
  }
  if (!/allocation after/.test(trades)) {
    issues.push({ severity: 'warning', message: 'Trades log is missing enriched allocation-after rationale fields.' });
  }
  if (!/report cycle snapshot|Initial dry-run funded state/.test(history)) {
    issues.push({ severity: 'info', message: 'History file does not show expected report-cycle or funding-state notes.' });
  }

  if (fs.existsSync(reportsDir)) {
    const markdownReports = [];
    for (const period of ['weekly', 'monthly', 'quarterly']) {
      const periodDir = path.join(reportsDir, period);
      if (!fs.existsSync(periodDir)) continue;
      for (const file of fs.readdirSync(periodDir)) {
        if (file.endsWith('.md')) markdownReports.push(path.join(periodDir, file));
      }
    }
    for (const markdownPath of markdownReports) {
      const pdfPath = markdownPath.replace(/\.md$/i, '.pdf');
      if (!fs.existsSync(pdfPath)) {
        issues.push({ severity: 'warning', message: `Missing PDF companion for report ${path.basename(markdownPath)}.` });
      }
    }
  }

  return issues;
}

module.exports = { validateGeneratedState };
