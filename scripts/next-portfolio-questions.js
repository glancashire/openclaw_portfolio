const { nextQuestions } = require('../src/workflows/portfolioDraftState');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/next-portfolio-questions.js <portfolio.md>');
  process.exit(1);
}

const questions = nextQuestions(target);
console.log(JSON.stringify({ count: questions.length, questions }, null, 2));
