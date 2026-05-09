const { generatePortfolioSummaryArtifacts, generateOverviewArtifacts } = require('../src/reporting/summaryArtifacts');

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/generate-portfolio-summary.js <portfolio-dir>');
    process.exit(1);
  }

  const result = await generatePortfolioSummaryArtifacts({ portfolioDir: target, writeFiles: true });
  const overview = await generateOverviewArtifacts({ writeFiles: true });
  console.log(JSON.stringify({ summary: result.outPath, summaryHtml: result.htmlPath, recoveryChecklist: result.recoveryPath, recoveryChecklistHtml: result.recoveryHtmlPath, portfolioIndex: overview.portfolioIndexPath, pendingActions: overview.pendingActionsPath }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
