const { validatePortfolioStrategy } = require('../src/validation/strategyValidation');

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('Usage: node scripts/validate-strategy.js <portfolio.md> [more files...]');
  process.exit(1);
}

let hasErrors = false;
for (const target of targets) {
  const issues = validatePortfolioStrategy(target);
  if (issues.length === 0) {
    console.log(`OK  ${target}`);
    continue;
  }
  console.log(`ISSUES  ${target}`);
  for (const issue of issues) {
    console.log(`- [${issue.severity}] ${issue.message}`);
    if (issue.severity === 'error') hasErrors = true;
  }
}

process.exit(hasErrors ? 1 : 0);
