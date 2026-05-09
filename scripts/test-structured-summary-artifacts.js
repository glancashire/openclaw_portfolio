const fs = require('fs');
const path = require('path');
const os = require('os');
const { collectPortfolioSummary, buildPortfolioIndex, buildPendingActionsOverview, generatePortfolioSummaryArtifacts, renderPortfolioSummaryMarkdown, buildRecoveryChecklist, renderRecoveryChecklistMarkdown } = require('../src/reporting/summaryArtifacts');
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
  const checklist = buildRecoveryChecklist(summary);
  const recoveryMarkdown = renderRecoveryChecklistMarkdown(checklist);
  const html = fs.readFileSync(path.join(portfolioDir, 'summary.html'), 'utf8');
  const recoveryHtml = fs.readFileSync(path.join(portfolioDir, 'recovery-checklist.html'), 'utf8');
  const recoveryJson = JSON.parse(fs.readFileSync(path.join(portfolioDir, 'recovery-checklist.json'), 'utf8'));
  const recoveryMd = fs.readFileSync(path.join(portfolioDir, 'recovery-checklist.md'), 'utf8');
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
  assert(summary.explanations && typeof summary.explanations.biggestDrift === 'string', 'Expected drift explanation');
  assert(typeof summary.explanations.executionBlock === 'string' && summary.explanations.executionBlock.length > 0, 'Expected execution explanation');
  assert(typeof summary.explanations.approvalBacklog === 'string' && summary.explanations.approvalBacklog.length > 0, 'Expected approval explanation');
  assert(summary.execution && summary.execution.tradeState && typeof summary.execution.tradeState.queuedForOpenRunner === 'number', 'Expected queued-for-open-runner trade-state count');
  assert(summary.execution && summary.execution.tradeState && typeof summary.execution.tradeState.blocked === 'number', 'Expected blocked trade-state count');
  assert(summary.execution && summary.execution.openRunnerRetryState && typeof summary.execution.openRunnerRetryState.queuedRetry === 'number', 'Expected queued-retry count');
  assert(typeof summary.execution.openRunnerRetryState.queuedInitial === 'number', 'Expected queued-initial count');
  assert(typeof summary.explanations.noTradePosture === 'string' && summary.explanations.noTradePosture.length > 0, 'Expected trade posture explanation');
  assert(typeof summary.recommendedNextStep === 'string' && summary.recommendedNextStep.length > 0, 'Expected recommended next step');
  assert(typeof renderedMarkdown === 'string' && renderedMarkdown.includes('# Portfolio Summary Page: etf'), 'Expected rendered portfolio summary markdown');
  assert(typeof recoveryMarkdown === 'string' && recoveryMarkdown.includes('# Recovery Checklist: etf'), 'Expected rendered recovery checklist markdown');
  assert(generated.htmlPath.endsWith('summary.html'), 'Expected generated per-portfolio html path');
  assert(generated.recoveryHtmlPath.endsWith('recovery-checklist.html'), 'Expected recovery checklist html path');
  assert(html.includes('Portfolio Summary Page: etf'), 'Expected portfolio summary html title content');
  assert(html.includes('Operator Queue Summary'), 'Expected queue summary section in html');
  assert(html.includes('Queued for open runner'), 'Expected queued-for-open-runner execution posture in html');
  assert(html.includes('Queued retries'), 'Expected queued-retry execution posture in html');
  assert(html.includes('Blocked rows'), 'Expected blocked-row execution posture in html');
  assert(html.includes('Recommended Next Step'), 'Expected recommendation section in html');
  assert(html.includes('Why This Portfolio Looks This Way'), 'Expected explanation section in html');
  assert(html.includes('outside the allowed band') || html.includes('broker readiness is degraded') || html.includes('approval-gated trade row'), 'Expected explanation text in summary html');
  assert(html.includes('<table>'), 'Expected html table rendering for summary page');
  assert(html.includes('report-container'), 'Expected improved report container class');
  assert(html.includes('--color-healthy'), 'Expected CSS custom properties for status colors');
  assert(html.includes('nth-child(even)'), 'Expected alternating row styling');
  assert(html.includes('<ol>') || html.includes('<ul>'), 'Expected list rendering in summary html');
  assert(checklist.summary.queueItemCount === summary.operatorQueue.items.length, 'Expected recovery checklist queue count to align');
  assert(recoveryJson.portfolio === 'etf', 'Expected recovery checklist json portfolio');
  assert(recoveryJson.summary.recommendedNextStep === summary.recommendedNextStep, 'Expected recovery checklist recommendation alignment');
  assert(recoveryMd.includes('## Action Checklist'), 'Expected action checklist markdown section');
  assert(recoveryHtml.includes('Recovery Checklist: etf'), 'Expected recovery checklist html title content');
  assert(recoveryHtml.includes('Why This Incident Exists'), 'Expected explanation section in recovery html');
  assert(recoveryHtml.includes('Action Checklist'), 'Expected action checklist section in html');
  assert(recoveryHtml.includes('<ol>') || recoveryHtml.includes('<ul>'), 'Expected list rendering in recovery checklist html');

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
