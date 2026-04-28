const { generateAndWriteReport } = require('../src/reporting/reportGenerator');
const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');
const { appendHistorySnapshot } = require('../src/analysis/historyWriter');
const path = require('path');

const portfolioDir = process.argv[2];
const period = process.argv[3];
const dateStamp = process.argv[4] || new Date().toISOString().slice(0, 10).replace(/-/g, '');

if (!portfolioDir || !period) {
  console.error('Usage: node scripts/run-report-cycle.js <portfolio-dir> <weekly|monthly|quarterly> [YYYYMMDD]');
  process.exit(1);
}

const historyPath = path.join(portfolioDir, 'history.md');
const holdingsPath = path.join(portfolioDir, 'holdings.md');
appendHistorySnapshot(historyPath, holdingsPath, 'end_of_day', `${period} report cycle snapshot`);
regenerateDashboard(portfolioDir);
const report = generateAndWriteReport({ portfolioDir, period, dateStamp });
console.log(JSON.stringify(report, null, 2));
