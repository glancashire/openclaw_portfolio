const fs = require('fs');
const path = require('path');
const { regenerateDashboard } = require('./dashboardGenerator');
const { generatePortfolioSummaryArtifacts, generateOverviewArtifacts } = require('./summaryArtifacts');
const { buildSelfHealPlan, classifyPortfolioHealth } = require('../execution/portfolioHealth');
const { reportDeliveryStatus } = require('./deliveryPolicy');
const { evaluateDeliveryPosture } = require('./deliveryDiagnostic');
const { loadFillNotificationState } = require('./fillNotificationState');
const { validateGeneratedState } = require('../validation/generatedStateValidation');
const { getInteractiveBrokersReadiness } = require('../brokers/interactive-brokers/readiness');
const { brokerErrorStatus } = require('../execution/runtimeState');
const { summarizeOpenRunnerRetryState, staleApprovalInventory } = require('../execution/tradeState');
const { page, card, badge, bulletList, kvTable } = require('./emailHtml');

function healthReportPaths(portfolioDir) {
  return {
    jsonPath: path.join(portfolioDir, 'health-report.json'),
    htmlPath: path.join(portfolioDir, 'health-report.html'),
    mdPath: path.join(portfolioDir, 'health-report.md'),
  };
}

function severityTone(severity) {
  if (severity === 'high') return 'danger';
  if (severity === 'medium') return 'warn';
  return 'success';
}

async function collectHealthSignals({ portfolioDir, repoRoot = process.cwd() }) {
  const portfolio = path.basename(portfolioDir);
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const brokerReadiness = await getInteractiveBrokersReadiness({ portfolio });
  const errorState = brokerErrorStatus(portfolio);
  const staleApprovedRows = staleApprovalInventory(tradesPath);
  const retryState = summarizeOpenRunnerRetryState(tradesPath);
  const deliveryStatus = reportDeliveryStatus({ portfolioDir });
  const deliveryPosture = evaluateDeliveryPosture({ portfolioDir });
  const fillNotificationState = loadFillNotificationState(repoRoot);
  const generatedStateIssues = validateGeneratedState(portfolioDir);
  const health = classifyPortfolioHealth({
    brokerReadiness,
    errorState,
    staleApprovedRows,
    retryState,
    deliveryStatus,
    fillNotificationState,
  });

  return {
    portfolio,
    generatedAt: new Date().toISOString(),
    brokerReadiness,
    errorState,
    staleApprovedRows,
    retryState,
    deliveryStatus,
    deliveryPosture,
    fillNotificationState,
    generatedStateIssues,
    health,
  };
}

async function attemptSafeSelfHeal({ portfolioDir }) {
  const actions = [];
  try {
    const dashboardPath = await regenerateDashboard(portfolioDir);
    actions.push({ kind: 'regenerate_dashboard', ok: true, dashboardPath });
  } catch (error) {
    actions.push({ kind: 'regenerate_dashboard', ok: false, error: error.message });
  }

  try {
    const summary = await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles: true });
    const repoRoot = path.dirname(path.dirname(portfolioDir)) || process.cwd();
    const overview = await generateOverviewArtifacts({ repoRoot, writeFiles: true });
    actions.push({ kind: 'regenerate_reporting_artifacts', ok: true, summaryPath: summary.outPath, overviewIndexPath: overview.portfolioIndexPath });
  } catch (error) {
    actions.push({ kind: 'regenerate_reporting_artifacts', ok: false, error: error.message });
  }

  return actions;
}

function buildHealthReportMarkdown(report) {
  const blockers = Array.isArray(report.health?.blockers) ? report.health.blockers : [];
  const healed = Array.isArray(report.selfHeal?.actions) ? report.selfHeal.actions.filter((item) => item.ok) : [];
  const failedFixes = Array.isArray(report.selfHeal?.actions) ? report.selfHeal.actions.filter((item) => !item.ok) : [];
  return [
    `# Health Report: ${report.portfolio}`,
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Health: ${report.health.health}`,
    `- Severity: ${report.health.severity}`,
    `- Blockers: ${blockers.length}`,
    `- Successful self-heals: ${healed.length}`,
    `- Failed self-heals: ${failedFixes.length}`,
    '',
    '## Outstanding issues',
    ...(blockers.length ? blockers.map((item) => `- [${item.code}] ${item.message}`) : ['- None.']),
    '',
    '## Recommended actions',
    ...((report.health.recommendedActions || []).length ? report.health.recommendedActions.map((item) => `- ${item}`) : ['- No immediate operator action is required.']),
    '',
    '## Self-heal results',
    ...((report.selfHeal?.actions || []).length ? report.selfHeal.actions.map((item) => `- ${item.kind}: ${item.ok ? 'ok' : `failed (${item.error})`}`) : ['- No self-heal actions were attempted.']),
  ].join('\n');
}

function buildHealthReportHtml(report) {
  const blockers = Array.isArray(report.health?.blockers) ? report.health.blockers : [];
  const healed = Array.isArray(report.selfHeal?.actions) ? report.selfHeal.actions.filter((item) => item.ok) : [];
  const failedFixes = Array.isArray(report.selfHeal?.actions) ? report.selfHeal.actions.filter((item) => !item.ok) : [];
  const statusBadge = badge({ label: `${report.health.health} / ${report.health.severity}`, tone: severityTone(report.health.severity) });

  const summaryCard = card({
    title: 'System health summary',
    contentHtml: `
      <div style="margin-bottom:14px;">${statusBadge}</div>
      ${kvTable([
        { label: 'Generated at', value: report.generatedAt },
        { label: 'Outstanding blockers', value: String(blockers.length) },
        { label: 'Successful self-heals', value: String(healed.length) },
        { label: 'Failed self-heals', value: String(failedFixes.length) },
      ])}
    `,
  });

  const issuesCard = card({
    title: 'Outstanding issues',
    contentHtml: blockers.length ? bulletList(blockers.map((item) => `[${item.code}] ${item.message}`)) : '<p style="margin:0;color:#6b7280;">No outstanding health blockers are currently surfaced.</p>',
  });

  const selfHealCard = card({
    title: 'Self-heal results',
    contentHtml: (report.selfHeal?.actions || []).length
      ? bulletList(report.selfHeal.actions.map((item) => `${item.kind}: ${item.ok ? 'fixed' : `not fixed (${item.error || 'unknown error'})`}`))
      : '<p style="margin:0;color:#6b7280;">No self-heal actions were attempted.</p>',
  });

  const nextActionsCard = card({
    title: 'Recommended next actions',
    contentHtml: bulletList((report.health.recommendedActions || []).length ? report.health.recommendedActions : ['No immediate operator action is required.']),
  });

  return page({
    eyebrow: 'OpenClaw Health Monitor',
    title: `${report.portfolio} system health report`,
    subtitle: 'Key portfolio automation, delivery, and reporting signals with safe self-heal results highlighted.',
    accent: '#7c2d12',
    bodyHtml: `${summaryCard}${issuesCard}${selfHealCard}${nextActionsCard}`,
    footer: 'OpenClaw Portfolio Manager • Health monitoring report',
  });
}

function writeHealthReportArtifacts(portfolioDir, report) {
  const paths = healthReportPaths(portfolioDir);
  const markdown = buildHealthReportMarkdown(report);
  const html = buildHealthReportHtml(report);
  fs.writeFileSync(paths.jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(paths.mdPath, markdown);
  fs.writeFileSync(paths.htmlPath, html);
  return { ...paths, markdown, html };
}

async function runHealthCheck({ portfolioDir, repoRoot = process.cwd(), applySafeFixes = true }) {
  const before = await collectHealthSignals({ portfolioDir, repoRoot });
  const plan = await buildSelfHealPlan({ portfolioDir, repoRoot });
  const selfHeal = {
    dryRun: !applySafeFixes,
    plannedActions: plan.actions,
    actions: applySafeFixes ? await attemptSafeSelfHeal({ portfolioDir }) : [],
  };
  const after = applySafeFixes ? await collectHealthSignals({ portfolioDir, repoRoot }) : before;
  const report = {
    schemaVersion: '1.0',
    portfolio: before.portfolio,
    generatedAt: new Date().toISOString(),
    before,
    after,
    health: after.health,
    selfHeal,
  };
  const artifacts = writeHealthReportArtifacts(portfolioDir, report);
  return { report, artifacts };
}

module.exports = {
  healthReportPaths,
  collectHealthSignals,
  attemptSafeSelfHeal,
  buildHealthReportMarkdown,
  buildHealthReportHtml,
  writeHealthReportArtifacts,
  runHealthCheck,
};
