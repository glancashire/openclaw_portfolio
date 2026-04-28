const { generateAndWriteReport } = require('../src/reporting/reportGenerator');

const portfolioDir = process.argv[2];
const period = process.argv[3] || 'weekly';
const dateStamp = process.argv[4] || new Date().toISOString().slice(0, 10).replace(/-/g, '');

if (!portfolioDir) {
  console.error('Usage: node scripts/generate-report.js <portfolio-dir> [weekly|monthly|quarterly] [YYYYMMDD]');
  process.exit(1);
}

const out = generateAndWriteReport({ portfolioDir, period, dateStamp });
console.log(JSON.stringify({ report: out }, null, 2));
