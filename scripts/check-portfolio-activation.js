const { activationReadiness } = require('../src/workflows/portfolioDraftState');
const { validatePortfolioStrategy } = require('../src/validation/strategyValidation');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/check-portfolio-activation.js <portfolio.md | portfolio-dir>');
  process.exit(1);
}

const readiness = activationReadiness(target);
const strategyIssues = validatePortfolioStrategy(target.endsWith('.md') ? target : `${target}/portfolio.md`)
  .filter((issue) => issue.severity !== 'info')
  .map((issue) => issue.message);
const blockers = [...readiness.blockers, ...strategyIssues];

if (blockers.length === 0) {
  console.log(JSON.stringify({ ready: true, blockers: [], requiredFiles: readiness.requiredFiles }, null, 2));
  process.exit(0);
}

console.log(JSON.stringify({
  ready: false,
  blockers,
  missingFiles: readiness.missingFiles,
  unresolvedPlaceholders: readiness.unresolvedPlaceholders,
  pendingQuestionKeys: readiness.pendingQuestionKeys,
  requiredFiles: readiness.requiredFiles,
}, null, 2));
process.exit(1);
