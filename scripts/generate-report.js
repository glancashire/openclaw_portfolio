const { generateAndWriteReport } = require('../src/reporting/reportGenerator');

const portfolioDir = process.argv[2];
const period = process.argv[3] || 'weekly';
const dateStamp = process.argv[4] || new Date().toISOString().slice(0, 10).replace(/-/g, '');

if (!portfolioDir) {
  console.error('Usage: node scripts/generate-report.js <portfolio-dir> [weekly|monthly|quarterly] [YYYYMMDD]');
  process.exit(1);
}

generateAndWriteReport({ portfolioDir, period, dateStamp })
  .then((out) => {
    console.log(JSON.stringify(out, null, 2));
  })
  .catch((error) => {
    console.error(error.stack || String(error));
    process.exit(1);
  });
