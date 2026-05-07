const fs = require('fs');
const path = require('path');
const os = require('os');
const { collectPortfolioSummary, buildPortfolioIndex, buildPendingActionsOverview, generatePortfolioSummaryArtifacts, renderPortfolioSummaryMarkdown } = require('../src/reporting/summaryArtifacts');
const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const portfolioDir = path.join(repoRoot, 'portfolio', 'etf');
  const runtimeEventsPath = path.join(repoRoot, 'runtime', 'events', 'runtime-events.jsonl');
  const executionStatePath = path.join(repoRoot, 'runtime', 'execution-state.json');
  const runtimeEventsBefore = fs.existsSync(runtimeEventsPath) ? fs.readFileSync(runtimeEventsPath, 'utf8') : null;
  const executionStateBefore = fs.existsSync(executionStatePath) ? fs.readFileSync(executionStatePath, 'utf8') : null;
  const dashboardPath = await regenerateDashboard(portfolioDir);
  const dashboard = fs.readFileSync(dashboardPath, 'utf8');
  const summary = await collectPortfolioSummary({ portfolioDir });
  const generated = await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles: true });
  const renderedMarkdown = renderPortfolioSummaryMarkdown(summary);
  const html = fs.readFileSync(path.join(portfolioDir, 'summary.html'), 'utf8');
  const index = buildPortfolioIndex([summary]);
  const pending = buildPendingActionsOverview([summary]);

  assert(summary.schemaVersion === '1.1', 'Expected summary schema version');
  assert(summary.portfolio === 'etf', 'Expected ETF portfolio summary');
  assert(summary.status.health, 'Expected summary health status');
  assert(summary.status.executionPosture, 'Expected execution posture');
  assert(Array.isArray(summary.allocation) && summary.allocation.length >= 3, 'Expected allocation rows');
  assert(Array.isArray(summary.instruments) && summary.instruments.length >= 4, 'Expected approved instruments in summary');
  assert(Array.isArray(summary.pendingActions), 'Expected pending actions array');
  assert(summary.operatorQueue && Array.isArray(summary.operatorQueue.items), 'Expected operator queue items');
  assert(summary.operatorQueue.summary && typeof summary.operatorQueue.summary.total === 'number', 'Expected operator queue summary');
  assert(Array.isArray(summary.recentMaterialEvents), 'Expected material events array');
  assert(typeof summary.recommendedNextStep === 'string' && summary.recommendedNextStep.length > 0, 'Expected recommended next step');
  assert(typeof renderedMarkdown === 'string' && renderedMarkdown.includes('# Portfolio Summary Page: etf'), 'Expected rendered portfolio summary markdown');
  assert(generated.htmlPath.endsWith('summary.html'), 'Expected generated per-portfolio html path');
  assert(html.includes('Portfolio Summary Page: etf'), 'Expected portfolio summary html title content');
  assert(html.includes('Operator Queue Summary'), 'Expected queue summary section in html');
  assert(html.includes('Recommended Next Step'), 'Expected recommendation section in html');
  assert(html.includes('<table>'), 'Expected html table rendering for summary page');
  assert(html.includes('<ol>') || html.includes('<ul>'), 'Expected list rendering in summary html');

  assert(dashboard.includes(`Portfolio status: ${summary.status.health}`), 'Dashboard health should align with summary');
  assert(dashboard.includes(`Pending approvals: ${summary.approvals.pendingApprovalCount}`), 'Dashboard pending approvals should align');
  assert(dashboard.includes(summary.recommendedNextStep), 'Dashboard recommendation should align with summary');
  assert(dashboard.includes(`Broker health: ${summary.status.brokerMessage}`), 'Dashboard broker message should align with summary');

  assert(index.schemaVersion === '1.1', 'Expected index schema version');
  assert(index.portfolioCount === 1, 'Expected one portfolio in index');
  assert(index.portfolios[0].portfolio === 'etf', 'Expected ETF in index');
  assert(index.portfolios[0].pendingApprovals === summary.approvals.pendingApprovalCount, 'Expected pending approval count in index');
  assert(index.portfolios[0].recommendedNextStep === summary.recommendedNextStep, 'Expected recommendation in index');

  assert(pending.schemaVersion === '1.1', 'Expected pending-actions schema version');
  assert(pending.queueSummary && typeof pending.queueSummary.total === 'number', 'Expected queue summary on pending-actions overview');
  assert(Array.isArray(pending.items), 'Expected pending actions list');
  assert(pending.itemCount === pending.items.length, 'Expected pending item count to match');
  if (pending.items.length > 1) {
    const severityRank = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < pending.items.length; i++) {
      const prev = severityRank[pending.items[i - 1].severity] ?? 99;
      const cur = severityRank[pending.items[i].severity] ?? 99;
      assert(prev <= cur, 'Expected pending actions sorted by severity');
      assert(typeof pending.items[i].queueType === 'string' && pending.items[i].queueType.length > 0, 'Expected queue type on pending items');
    }
  }

  assert(typeof summary.status.brokerHealth === 'string' && summary.status.brokerHealth.length > 0, 'Expected broker health classification');
  assert(typeof summary.status.brokerMessage === 'string' && summary.status.brokerMessage.length > 0, 'Expected broker status message');

  if (runtimeEventsBefore == null) {
    if (fs.existsSync(runtimeEventsPath)) fs.unlinkSync(runtimeEventsPath);
  } else {
    fs.writeFileSync(runtimeEventsPath, runtimeEventsBefore);
  }
  if (executionStateBefore == null) {
    if (fs.existsSync(executionStatePath)) fs.unlinkSync(executionStatePath);
  } else {
    fs.writeFileSync(executionStatePath, executionStateBefore);
  }

  console.log(JSON.stringify({ ok: true, pendingActions: pending.itemCount, dashboardPath }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
