const fs = require('fs');
const path = require('path');
const { executionLifecycleSummary, recentTrades } = require('../src/reporting/portfolioData');
const { latestHistory } = require('../src/reporting/portfolioData');
const { brokerErrorStatus } = require('../src/execution/runtimeState');
const { fileFreshnessSummary } = require('../src/reporting/dashboardGenerator');

function main() {
  const [portfolioDirArg] = process.argv.slice(2);
  if (!portfolioDirArg) {
    console.error('Usage: node scripts/operator-incident-summary.js <portfolio-dir>');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);
  const portfolioName = path.basename(portfolioDir);
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const historyPath = path.join(portfolioDir, 'history.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const dashboardPath = path.join(portfolioDir, 'dashboard.md');

  const summary = {
    ok: true,
    portfolio: portfolioName,
    brokerErrorStatus: brokerErrorStatus(portfolioName),
    executionLifecycle: executionLifecycleSummary(tradesPath),
    latestHistory: latestHistory(historyPath),
    recentTrades: recentTrades(tradesPath, 8),
    freshness: fileFreshnessSummary({
      dashboardPath,
      sourcePaths: [portfolioPath, holdingsPath, tradesPath, historyPath].filter((filePath) => fs.existsSync(filePath)),
    }),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main();
