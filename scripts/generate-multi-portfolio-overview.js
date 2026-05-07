const { generateOverviewBoard } = require('../src/reporting/overviewBoard');

async function main() {
  const result = await generateOverviewBoard({ writeFiles: true });
  console.log(JSON.stringify({ markdown: result.markdownPath, html: result.htmlPath, approvalsQueue: result.approvalsQueuePath, approvalsQueueHtml: result.approvalsQueueHtmlPath, dailySummary: result.dailySummaryPath, dailySummaryHtml: result.dailySummaryHtmlPath, reportHistory: result.reportHistoryPath, reportHistoryHtml: result.reportHistoryHtmlPath }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
