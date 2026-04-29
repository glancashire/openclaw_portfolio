const path = require('path');
const { evaluateSafetyControls } = require('../src/validation/safetyControls');

const portfolioDir = process.argv[2];
if (!portfolioDir) {
  console.error('Usage: node scripts/check-safety-controls.js <portfolio-dir>');
  process.exit(1);
}

const blockers = evaluateSafetyControls({
  portfolioPath: path.join(portfolioDir, 'portfolio.md'),
  holdingsPath: path.join(portfolioDir, 'holdings.md'),
});

if (!blockers.length) {
  console.log(`OK  ${portfolioDir}`);
  process.exit(0);
}

console.log(`ISSUES  ${portfolioDir}`);
for (const blocker of blockers) console.log(`- [${blocker.severity}] ${blocker.message}`);
process.exit(blockers.some((b) => b.severity === 'error') ? 1 : 0);
