const { validatePortfolioConsistency } = require('../src/validation/portfolioConsistency');
const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/check-portfolio-consistency.js <portfolio.md>');
  process.exit(1);
}
const issues = validatePortfolioConsistency(target);
if (!issues.length) {
  console.log(`OK  ${target}`);
  process.exit(0);
}
console.log(`ISSUES  ${target}`);
for (const issue of issues) console.log(`- [${issue.severity}] ${issue.message}`);
process.exit(issues.some((i) => i.severity === 'error') ? 1 : 0);
