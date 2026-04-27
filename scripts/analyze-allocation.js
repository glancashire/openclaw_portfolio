const { analyzeAllocation } = require('../src/analysis/allocationAnalysis');

const portfolioPath = process.argv[2];
const holdingsPath = process.argv[3];
if (!portfolioPath || !holdingsPath) {
  console.error('Usage: node scripts/analyze-allocation.js <portfolio.md> <holdings.md>');
  process.exit(1);
}

const result = analyzeAllocation({ portfolioPath, holdingsPath });
console.log(JSON.stringify(result, null, 2));
