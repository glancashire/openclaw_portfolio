const fs = require('fs');
const { validatePortfolioStrategy } = require('../src/validation/strategyValidation');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/check-portfolio-activation.js <portfolio.md>');
  process.exit(1);
}

const text = fs.readFileSync(target, 'utf8');
const issues = validatePortfolioStrategy(target).filter((issue) => issue.severity !== 'info');

const blockers = [];
if (/<[^>]+>|YYYY-MM-DD|YYYY-MM-DD HH:mm:ss/.test(text)) {
  blockers.push('Unresolved placeholders remain.');
}
if (text.includes('Status: draft')) {
  blockers.push('Portfolio status is still draft.');
}
if (!text.includes('| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |')) {
  blockers.push('Approved Instruments table missing.');
}
const rows = text.split(/\r?\n/).filter((line) => line.startsWith('|') && !line.includes('---'));
const approvedRows = rows.filter((line) => !line.includes('Ticker / ISIN') && !line.includes('Reason |'));
if (approvedRows.length === 0) {
  blockers.push('No approved instruments added yet.');
}

for (const issue of issues) {
  if (issue.severity === 'error' || issue.severity === 'warning') blockers.push(issue.message);
}

if (blockers.length === 0) {
  console.log(JSON.stringify({ ready: true, blockers: [] }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify({ ready: false, blockers }, null, 2));
process.exit(1);
