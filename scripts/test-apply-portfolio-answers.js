const fs = require('fs');
const path = require('path');
const { applyAnswersToPortfolio } = require('../src/workflows/applyPortfolioAnswers');
const { nextQuestions } = require('../src/workflows/portfolioDraftState');

const source = process.argv[2] || 'portfolio/etf/portfolio.md';
const temp = path.join('tmp', 'portfolio-answer-test.md');
fs.mkdirSync('tmp', { recursive: true });
fs.copyFileSync(source, temp);
applyAnswersToPortfolio(temp, {
  excludedInstruments: 'none',
  alreadyHeldInstruments: 'none',
});
const text = fs.readFileSync(temp, 'utf8');
const questions = nextQuestions(temp);
console.log(JSON.stringify({
  temp,
  excludedSection: text.match(/## Excluded Instruments[\s\S]*?## Rebalancing Policy/)?.[0] || null,
  remainingQuestions: questions,
}, null, 2));
