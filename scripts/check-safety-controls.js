const fs = require('fs');
const path = require('path');
const { evaluateSafetyControls } = require('../src/validation/safetyControls');

const arg1 = process.argv[2];
const arg2 = process.argv[3];
if (!arg1) {
  console.error('Usage: node scripts/check-safety-controls.js <portfolio-dir | portfolio.md> [holdings.md]');
  process.exit(1);
}

const { portfolioPath, holdingsPath, label } = resolveInputs(arg1, arg2);
const evaluation = evaluateSafetyControls({ portfolioPath, holdingsPath });
const blockers = evaluation.blockers || [];

if (!blockers.length) {
  console.log(`OK  ${label}`);
  console.log(JSON.stringify({ diagnostics: evaluation.diagnostics || {} }, null, 2));
  process.exit(0);
}

console.log(`ISSUES  ${label}`);
for (const blocker of blockers) console.log(`- [${blocker.severity}] ${blocker.message}`);
console.log(JSON.stringify({ diagnostics: evaluation.diagnostics || {} }, null, 2));
process.exit(blockers.some((b) => b.severity === 'error') ? 1 : 0);

function resolveInputs(first, second) {
  const firstPath = path.resolve(first);
  const stat = fs.existsSync(firstPath) ? fs.statSync(firstPath) : null;

  if (stat?.isDirectory()) {
    return {
      portfolioPath: path.join(firstPath, 'portfolio.md'),
      holdingsPath: path.join(firstPath, 'holdings.md'),
      label: first,
    };
  }

  const portfolioPath = firstPath;
  const holdingsPath = second ? path.resolve(second) : path.join(path.dirname(firstPath), 'holdings.md');
  return {
    portfolioPath,
    holdingsPath,
    label: `${path.relative(process.cwd(), portfolioPath)} | ${path.relative(process.cwd(), holdingsPath)}`,
  };
}
