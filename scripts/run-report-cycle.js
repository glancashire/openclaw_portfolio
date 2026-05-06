const { generateAndWriteReport } = require('../src/reporting/reportGenerator');
const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');
const { appendHistorySnapshot } = require('../src/analysis/historyWriter');
const path = require('path');

async function main() {
  const portfolioDir = process.argv[2];
  const period = process.argv[3];
  const dateStamp = process.argv[4] || new Date().toISOString().slice(0, 10).replace(/-/g, '');

  if (!portfolioDir || !period) {
    console.error('Usage: node scripts/run-report-cycle.js <portfolio-dir> <weekly|monthly|quarterly> [YYYYMMDD]');
    process.exit(1);
  }

  const historyPath = path.join(portfolioDir, 'history.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const historyAppend = appendHistorySnapshot(historyPath, holdingsPath, 'end_of_day', `${period} report cycle snapshot`);
  const dashboardPath = await regenerateDashboard(portfolioDir);
  const report = await generateAndWriteReport({ portfolioDir, period, dateStamp });
  console.log(JSON.stringify({ historyAppend, dashboardPath, ...report }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
