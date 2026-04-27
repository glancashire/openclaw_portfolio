const { generateAndWriteReport } = require('../src/reporting/reportGenerator');

const portfolioDir = process.argv[2];
const period = process.argv[3];
const dateStamp = process.argv[4] || 'YYYYMMDD';
if (!portfolioDir || !period) {
  console.error('Usage: node scripts/generate-report.js <portfolio-dir> <weekly|monthly|quarterly> [YYYYMMDD]');
  process.exit(1);
}

const out = generateAndWriteReport({ portfolioDir, period, dateStamp });
console.log(JSON.stringify({ report: out }, null, 2));
