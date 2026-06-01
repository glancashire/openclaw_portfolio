const fs = require('fs');
const path = require('path');
const { markdownToBasicHtml } = require('./pdfExport');
const { ensureDirFor, writeTextIfChanged } = require('./artifactWriter');
const { generateOverviewArtifacts } = require('./summaryArtifacts');
const { fetchCronHealth } = require('./cronJobsFetcher');
const { evaluateLiveReadinessPreflight } = require('../execution/liveReadinessPreflight');
const { loadOpenPhasesCard, renderOpenPhasesMarkdown } = require('./openPhasesCard');

function classifyPortfolioKind(item = {}) {
  const name = String(item.portfolio || '').toLowerCase();
  if (name.startsWith('_')) return 'template';
  if (name.includes('template')) return 'template';
  if (name.includes('acceptance') || name.includes('demo') || name.includes('closure')) return 'demo_like';
  return 'active';
}

function formatDriftSummary(driftStatuses = []) {
  if (!Array.isArray(driftStatuses) || !driftStatuses.length) return 'n/a';
  const severe = driftStatuses.filter((row) => row.status === 'out_of_bounds');
  const minor = driftStatuses.filter((row) => row.status === 'drifted');
  if (severe.length) return `${severe.length} out_of_bounds`;
  if (minor.length) return `${minor.length} drifted`;
  return 'on_track';
}

function summarizeOverview(index = {}, pending = {}) {
  const portfolios = Array.isArray(index.portfolios) ? index.portfolios : [];
  const totals = {
    portfolioCount: portfolios.length,
    totalValueChf: Number(index.totalValueChf || 0),
    healthyCount: portfolios.filter((item) => item.status === 'healthy').length,
    warningCount: portfolios.filter((item) => item.status === 'warning' || item.status === 'attention_needed').length,
    blockedCount: portfolios.filter((item) => item.status === 'blocked').length,
    pendingApprovals: portfolios.reduce((sum, item) => sum + Number(item.pendingApprovals || 0), 0),
    pendingActions: Array.isArray(pending.items) ? pending.items.length : 0,
    activeCount: portfolios.filter((item) => classifyPortfolioKind(item) === 'active').length,
    demoLikeCount: portfolios.filter((item) => classifyPortfolioKind(item) === 'demo_like').length,
  };
  return totals;
}

function formatRecommendedActionLabel(item = {}) {
  const queueType = item.queueType || 'workflow';
  if (queueType === 'open_runner_queue') return 'open_runner/first_handoff';
  if (queueType === 'open_runner_retry') return 'open_runner/retry';
  return `${queueType}/${item.severity}/${item.status}`;
}

function buildRecommendedActionRows(pending = {}) {
  const items = Array.isArray(pending.items) ? pending.items : [];
  if (!items.length) return '1. No pending cross-portfolio actions.';
  return items.slice(0, 10).map((item, index) => `${index + 1}. [${formatRecommendedActionLabel(item)}] ${item.portfolio}: ${item.summary} — ${item.recommendedOperatorAction}`).join('\n');
}

function formatQueueSummary(summary = {}) {
  return [
    `- Total queue items: ${summary.total || 0}`,
    `- Blocking items: ${summary.blocking || 0}`,
    `- Approval items: ${summary.approvals || 0}`,
    `- Fresh actionable approvals: ${summary.freshApprovals || 0}`,
    `- Stale approvals needing reapproval: ${summary.staleApprovals || 0}`,
    `- Execution items: ${summary.execution || 0}`,
    `- Open-runner first handoffs: ${summary.openRunnerQueue || 0}`,
    `- Open-runner retries: ${summary.openRunnerRetry || 0}`,
    `- Recovery items: ${summary.recovery || 0}`,
    `- Delivery items: ${summary.delivery || 0}`,
    `- Data items: ${summary.data || 0}`,
    `- Warning items: ${summary.warnings || 0}`,
    `- Workflow items: ${summary.workflow || 0}`,
  ].join('\n');
}

function brokerBlockHint(item = {}) {
  if (!item.topBrokerBlock?.blockCode) return item.recommendedNextStep;
  const instrument = item.topBrokerBlock.tickerOrIsin ? ` ${item.topBrokerBlock.tickerOrIsin}` : '';
  return `[${item.topBrokerBlock.blockCode}${instrument}] ${item.topBrokerBlock.nextAction || item.recommendedNextStep}`;
}

function buildPortfolioTable(index = {}) {
  const portfolios = Array.isArray(index.portfolios) ? index.portfolios : [];
  if (!portfolios.length) {
    return '| none | n/a | 0 | unknown | n/a | 0 | 0 | 0 | 0 | 0 | no portfolios discovered |\n';
  }
  return portfolios.map((item) => `| ${item.portfolio} | ${classifyPortfolioKind(item)} | ${item.totalValueChf} | ${item.status} | ${formatDriftSummary(item.driftStatuses)} | ${item.blockers} | ${item.pendingApprovals} | ${item.pendingActions} | ${item.openRunnerQueue || 0} | ${item.openRunnerRetry || 0} | ${brokerBlockHint(item)} |`).join('\n');
}

function formatOverviewMarkdown({ index, pending, openPhases }) {
  const totals = summarizeOverview(index, pending);
  const openPhasesSection = renderOpenPhasesMarkdown(openPhases);
  return `# Multi-Portfolio Overview\n\n## Summary\n- Generated at: ${index.generatedAt || new Date().toISOString()}\n- Portfolios discovered: ${totals.portfolioCount}\n- Active portfolios: ${totals.activeCount}\n- Demo-like portfolios: ${totals.demoLikeCount}\n- Total value CHF: ${totals.totalValueChf}\n- Healthy portfolios: ${totals.healthyCount}\n- Warning / attention portfolios: ${totals.warningCount}\n- Blocked portfolios: ${totals.blockedCount}\n- Pending approvals: ${totals.pendingApprovals}\n- Pending actions: ${totals.pendingActions}\n\n${openPhasesSection}\n## Portfolio Board\n| Portfolio | Kind | Total value CHF | Health | Drift posture | Blockers | Pending approvals | Pending actions | First handoffs | Retries | Recommended next step |\n|---|---|---:|---|---|---:|---:|---:|---:|---:|---|\n${buildPortfolioTable(index)}\n\n## Operator Queue Summary\n${formatQueueSummary(pending.queueSummary || {})}\n\n## Cross-Portfolio Recommended Actions\n${buildRecommendedActionRows(pending)}\n\n## Notes\n- This board is generated from Phase 29 structured summary artifacts rather than by re-deriving state directly from Markdown.\n- Demo-like portfolios are surfaced explicitly so they do not silently disappear from operator review.\n- Open phases are read from the maintained CURRENT_PLAN.md control file (legacy OPEN_PHASES_OVERVIEW.md still supported as a fallback).\n`;
}

async function generateOverviewBoard({ repoRoot = process.cwd(), writeFiles = true } = {}) {
  const readiness = await evaluateLiveReadinessPreflight({ portfolioDir: path.join(repoRoot, 'portfolio', 'etf') }).catch(() => null);
  const { portfolioIndex, pendingActions } = await generateOverviewArtifacts({ repoRoot, writeFiles: true, readiness, cronHealth: fetchCronHealth() });
  const openPhases = loadOpenPhasesCard({ repoRoot });
  const markdown = formatOverviewMarkdown({ index: portfolioIndex, pending: pendingActions, openPhases });
  const overviewDir = path.join(repoRoot, 'runtime', 'overview');
  const markdownPath = path.join(overviewDir, 'portfolio-overview.md');
  const htmlPath = path.join(overviewDir, 'portfolio-overview.html');
  if (writeFiles) {
    ensureDirFor(markdownPath);
    writeTextIfChanged(markdownPath, markdown);
    writeTextIfChanged(htmlPath, markdownToBasicHtml(markdown));
  }
  return {
    markdown,
    markdownPath,
    htmlPath,
    portfolioIndex,
    pendingActions,
    openPhases,
  };
}

module.exports = {
  classifyPortfolioKind,
  formatDriftSummary,
  summarizeOverview,
  formatRecommendedActionLabel,
  buildRecommendedActionRows,
  buildPortfolioTable,
  brokerBlockHint,
  formatOverviewMarkdown,
  formatQueueSummary,
  generateOverviewBoard,
};
