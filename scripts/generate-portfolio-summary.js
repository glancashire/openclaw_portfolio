const { generatePortfolioSummaryArtifacts, generateOverviewArtifacts } = require('../src/reporting/summaryArtifacts');
const { deliverPortfolioSummaryEmail } = require('../src/reporting/deliveryExecutor');
const { fetchCronHealth } = require('../src/reporting/cronJobsFetcher');

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node scripts/generate-portfolio-summary.js <portfolio-dir>');
    process.exit(1);
  }

  const result = await generatePortfolioSummaryArtifacts({ portfolioDir: target, writeFiles: true });
  const cronHealth = fetchCronHealth();
  const overview = await generateOverviewArtifacts({ writeFiles: true, cronHealth });
  const emailDelivery = await deliverPortfolioSummaryEmail({
    portfolioDir: target,
    period: 'summary',
    summaryPath: result.outPath,
    summaryHtmlPath: result.htmlPath,
  });
  console.log(JSON.stringify({ summary: result.outPath, summaryHtml: result.htmlPath, recoveryChecklist: result.recoveryPath, recoveryChecklistHtml: result.recoveryHtmlPath, portfolioIndex: overview.portfolioIndexPath, pendingActions: overview.pendingActionsPath, emailDelivery }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
