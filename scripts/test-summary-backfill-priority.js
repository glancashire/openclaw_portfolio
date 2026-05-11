const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { generatePortfolioSummaryArtifacts } = require('../src/reporting/summaryArtifacts');

(async function main() {
  await generatePortfolioSummaryArtifacts({ portfolioDir: 'portfolio/etf', writeFiles: true });
  const summaryPath = path.join(process.cwd(), 'portfolio/etf/summary.json');
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  assert.strictEqual(
    summary.recommendedNextStep,
    '1 reconciled fill(s) were detected after the live window and still need notification backfill review.',
    `unexpected recommendedNextStep: ${summary.recommendedNextStep}`,
  );
  console.log(JSON.stringify({ ok: true, recommendedNextStep: summary.recommendedNextStep }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
