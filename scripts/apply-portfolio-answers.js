const fs = require('fs');
const { applyAnswersToPortfolio } = require('../src/workflows/applyPortfolioAnswers');

const filePath = process.argv[2];
const jsonPath = process.argv[3];
if (!filePath || !jsonPath) {
  console.error('Usage: node scripts/apply-portfolio-answers.js <portfolio.md> <answers.json>');
  process.exit(1);
}

const answers = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
applyAnswersToPortfolio(filePath, answers);
console.log(JSON.stringify({ updated: filePath, appliedKeys: Object.keys(answers) }, null, 2));
