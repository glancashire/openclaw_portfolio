const { guidedQuestions, onboardingWorkflow, activationReadiness } = require('../src/workflows/portfolioDraftState');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/next-portfolio-questions.js <portfolio.md>');
  process.exit(1);
}

const workflow = onboardingWorkflow(target);
const readiness = activationReadiness(target);
const questions = guidedQuestions(target);
console.log(JSON.stringify({
  count: questions.length,
  questions,
  workflow,
  readiness: {
    ready: readiness.ready,
    blockers: readiness.blockers,
    missingFiles: readiness.missingFiles,
    pendingQuestionKeys: readiness.pendingQuestionKeys,
  },
}, null, 2));
