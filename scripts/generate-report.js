const { formatReport, writeReport } = require('../src/reporting/reportGenerator');

const portfolioDir = process.argv[2];
const period = process.argv[3];
const dateStamp = process.argv[4] || 'YYYYMMDD';
if (!portfolioDir || !period) {
  console.error('Usage: node scripts/generate-report.js <portfolio-dir> <weekly|monthly|quarterly> [YYYYMMDD]');
  process.exit(1);
}

const content = formatReport({
  portfolioName: portfolioDir.split('/').pop(),
  period,
  generated: new Date().toISOString(),
});
const out = writeReport({ portfolioDir, period, dateStamp, content });
console.log(JSON.stringify({ report: out }, null, 2));
