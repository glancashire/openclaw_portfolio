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
  const nextActions = (report.health.recommendedActions || []).length
    ? report.health.recommendedActions
    : ['No immediate operator action is required.'];
  const generatedIssues = Array.isArray(report.after?.generatedStateIssues) ? report.after.generatedStateIssues : [];
  const deliveryPending = Array.isArray(report.after?.deliveryStatus?.pendingActions) ? report.after.deliveryStatus.pendingActions : [];
  const fillBackfillCount = Number(report.after?.fillNotificationState?.reconciledUnnotifiedFills?.length || 0);
  const acknowledgedBackfillCount = Number(report.after?.fillNotificationState?.acknowledgedBackfilledFills?.length || 0);

  return [
    `# Health Report: ${report.portfolio}`,
    '',
    '## Immediate status',
    `- Generated at: ${report.generatedAt}`,
    `- Health: ${report.health.health}`,
    `- Severity: ${report.health.severity}`,
    `- Next action: ${report.health.nextAction || nextActions[0]}`,
    `- Unresolved exceptions: ${blockers.length}`,
    `- Remediated items: ${healed.length}`,
    `- Failed remediations: ${failedFixes.length}`,
    '',
    '## Unresolved exceptions',
    ...(blockers.length ? blockers.map((item) => `- [${item.code}] ${item.message}`) : ['- None.']),
    '',
    '## Recommended next actions',
    ...nextActions.map((item) => `- ${item}`),
    '',
    '## Remediated during this run',
    ...(healed.length ? healed.map((item) => `- ${item.kind}: fixed`) : ['- None.']),
    '',
    '## Remediation attempts that still need attention',
    ...(failedFixes.length ? failedFixes.map((item) => `- ${item.kind}: failed (${item.error || 'unknown error'})`) : ['- None.']),
    '',
    '## Remaining status and reference details',
    `- Generated-state issues: ${generatedIssues.length}`,
    ...(generatedIssues.length ? generatedIssues.map((item) => `  - [${item.severity}] ${item.message}`) : []),
    `- Delivery pending actions: ${deliveryPending.length}`,
    ...(deliveryPending.length ? deliveryPending.map((item) => `  - ${item}`) : []),
    `- Fill backfill review still open: ${fillBackfillCount}`,
    `- Acknowledged backfilled fills: ${acknowledgedBackfillCount}`,
  ].join('\n');
}

function buildHealthReportHtml(report) {
  const blockers = Array.isArray(report.health?.blockers) ? report.health.blockers : [];
  const healed = Array.isArray(report.selfHeal?.actions) ? report.selfHeal.actions.filter((item) => item.ok) : [];
  const failedFixes = Array.isArray(report.selfHeal?.actions) ? report.selfHeal.actions.filter((item) => !item.ok) : [];
  const nextActions = (report.health.recommendedActions || []).length
    ? report.health.recommendedActions
    : ['No immediate operator action is required.'];
  const generatedIssues = Array.isArray(report.after?.generatedStateIssues) ? report.after.generatedStateIssues : [];
  const deliveryPending = Array.isArray(report.after?.deliveryStatus?.pendingActions) ? report.after.deliveryStatus.pendingActions : [];
  const fillBackfillCount = Number(report.after?.fillNotificationState?.reconciledUnnotifiedFills?.length || 0);
  const acknowledgedBackfillCount = Number(report.after?.fillNotificationState?.acknowledgedBackfilledFills?.length || 0);
  const statusBadge = badge({ label: `${report.health.health} / ${report.health.severity}`, tone: severityTone(report.health.severity) });
  const nextActionBadge = badge({ label: blockers.length ? 'Action required' : 'No urgent exception', tone: blockers.length ? 'danger' : 'success' });

  const summaryCard = card({
    title: 'Immediate status',
    contentHtml: `
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">${statusBadge}${nextActionBadge}</div>
      <div style="margin:0 0 16px;padding:14px 16px;background:#fff7ed;border:1px solid #fdba74;border-radius:12px;">
        <div style="font-size:12px;color:#9a3412;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;margin-bottom:6px;">Next action</div>
        <div style="font-size:16px;font-weight:700;color:#7c2d12;line-height:1.5;">${report.health.nextAction || nextActions[0]}</div>
      </div>
      ${kvTable([
        { label: 'Generated at', value: report.generatedAt },
        { label: 'Unresolved exceptions', value: String(blockers.length) },
        { label: 'Remediated items', value: String(healed.length) },
        { label: 'Failed remediations', value: String(failedFixes.length) },
      ])}
    `,
  });

  const issuesCard = card({
    title: 'Unresolved exceptions',
    contentHtml: blockers.length
      ? bulletList(blockers.map((item) => `[${item.code}] ${item.message}`))
      : '<p style="margin:0;color:#166534;font-weight:600;">No unresolved exceptions are currently surfaced.</p>',
  });

  const nextActionsCard = card({
    title: 'Recommended next actions',
    contentHtml: bulletList(nextActions),
  });

  const remediatedCard = card({
    title: 'Remediated during this run',
    contentHtml: healed.length
      ? bulletList(healed.map((item) => `${item.kind}: fixed`))
      : '<p style="margin:0;color:#6b7280;">No issues were remediated during this run.</p>',
  });

  const failedFixesCard = card({
    title: 'Remediation attempts that still need attention',
    contentHtml: failedFixes.length
      ? bulletList(failedFixes.map((item) => `${item.kind}: not fixed (${item.error || 'unknown error'})`))
      : '<p style="margin:0;color:#6b7280;">No failed remediation attempts were recorded.</p>',
  });

  const referenceCard = card({
    title: 'Remaining status and reference details',
    contentHtml: `
      ${kvTable([
        { label: 'Generated-state issues', value: String(generatedIssues.length) },
        { label: 'Delivery pending actions', value: String(deliveryPending.length) },
        { label: 'Fill backfill review still open', value: String(fillBackfillCount) },
        { label: 'Acknowledged backfilled fills', value: String(acknowledgedBackfillCount) },
      ])}
      <div style="height:12px"></div>
      ${generatedIssues.length ? `<div style="margin-bottom:12px;"><div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;margin-bottom:8px;">Generated-state issues</div>${bulletList(generatedIssues.map((item) => `[${item.severity}] ${item.message}`))}</div>` : ''}
      ${deliveryPending.length ? `<div><div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;margin-bottom:8px;">Delivery pending actions</div>${bulletList(deliveryPending)}</div>` : ''}
      ${!generatedIssues.length && !deliveryPending.length ? '<p style="margin:0;color:#6b7280;">No additional low-priority status details require review.</p>' : ''}
    `,
  });

  return page({
    eyebrow: 'OpenClaw Health Monitor',
    title: `${report.portfolio} system health report`,
    subtitle: 'Exceptions and next actions first, followed by remediated items and lower-priority reference details.',
    accent: '#7c2d12',
    bodyHtml: `${summaryCard}${issuesCard}${nextActionsCard}${remediatedCard}${failedFixesCard}${referenceCard}`,
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
