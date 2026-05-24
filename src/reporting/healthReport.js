const fs = require('fs');
const path = require('path');
const { regenerateDashboard } = require('./dashboardGenerator');
const { generatePortfolioSummaryArtifacts, generateOverviewArtifacts } = require('./summaryArtifacts');
const { fetchCronHealth } = require('./cronJobsFetcher');
const { buildSelfHealPlan, classifyPortfolioHealth } = require('../execution/portfolioHealth');
const { appendObservabilityEvent, readObservabilityEvents } = require('../execution/selfHeal');
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

function operatorCommandForIssue(issue = {}, portfolio = 'etf') {
  switch (issue.category) {
    case 'delivery_missing_target':
      return 'Configure a valid delivery target or switch the reporting path to email delivery.';
    case 'ibkr_socket_dead':
      return '/home/ubuntu/ibgateway-native/start-ibc.sh';
    case 'cron_excessive_errors':
      return 'openclaw cron disable <jobId>';
    case 'market_data_subscription_gap':
      return 'node scripts/probe-market-data-subscriptions.js';
    case 'broker_automation_paused':
      return `node scripts/run-health-check.js portfolio/${portfolio} --dry-run`;
    default:
      return `node scripts/run-health-check.js portfolio/${portfolio} --dry-run`;
  }
}

function summarizeHealthTrends(events = [], { limit = 7 } = {}) {
  const recent = events.filter((event) => event.kind === 'health_check').slice(-limit);
  const counts = recent.reduce((acc, event) => {
    acc[event.health] = (acc[event.health] || 0) + 1;
    return acc;
  }, {});
  return {
    recent,
    summaryLines: recent.map((event) => `${event.at}: ${event.health}/${event.severity} (blockers=${event.blockerCount || 0})`),
    counts,
  };
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
    actions.push({ kind: 'regenerate_dashboard', ok: true, applied: true, dashboardPath });
  } catch (error) {
    actions.push({ kind: 'regenerate_dashboard', ok: false, applied: false, error: error.message });
  }

  try {
    const summary = await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles: true });
    const repoRoot = path.dirname(path.dirname(portfolioDir)) || process.cwd();
    const overview = await generateOverviewArtifacts({ repoRoot, writeFiles: true, cronHealth: fetchCronHealth() });
    actions.push({ kind: 'regenerate_reporting_artifacts', ok: true, applied: true, summaryPath: summary.outPath, overviewIndexPath: overview.portfolioIndexPath });
  } catch (error) {
    actions.push({ kind: 'regenerate_reporting_artifacts', ok: false, applied: false, error: error.message });
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
  const classified = Array.isArray(report.selfHeal?.classified) ? report.selfHeal.classified : [];
  const openIssues = Array.isArray(report.selfHeal?.openIssues) ? report.selfHeal.openIssues : [];
  const operatorCommands = Array.isArray(report.selfHeal?.operatorCommands) ? report.selfHeal.operatorCommands : [];
  const trends = report.trends || { summaryLines: [] };
  const isHealthy = blockers.length === 0 && failedFixes.length === 0 && openIssues.length === 0;

  return [
    `# Health Report: ${report.portfolio}`,
    '',
    '## Management summary',
    `- Generated at: ${report.generatedAt}`,
    `- Current status: ${report.health.health} (${report.health.severity})`,
    `- Management summary: ${isHealthy ? 'Everything important is working normally. No action is needed right now.' : report.health.nextAction || nextActions[0]}`,
    `- Next step: ${report.health.nextAction || nextActions[0]}`,
    `- Automatic fixes applied: ${healed.length}`,
    `- Issues still needing attention: ${blockers.length + openIssues.length + failedFixes.length}`,
    '',
    '## What needs attention now',
    ...(blockers.length ? blockers.map((item) => `- [${item.code}] ${item.message}`) : ['- No urgent exceptions are open right now.']),
    ...(nextActions.length ? nextActions.map((item) => `- Next action: ${item}`) : []),
    '',
    '## What the system already handled',
    ...(healed.length ? healed.map((item) => `- ${item.kind}: ${item.applied ? 'applied automatically' : item.blocked || 'not applied'}`) : ['- No automatic fixes were needed this cycle.']),
    ...(classified.length ? ['', '### Detected symptoms', ...classified.map((item) => `- [${item.category}] ${item.symptom}`)] : []),
    '',
    '## What still needs you',
    ...(openIssues.length ? openIssues.map((item, index) => `- [${item.category}] ${item.summary}${operatorCommands[index] ? ` — Suggested command: ${operatorCommands[index].command}` : ''}`) : ['- Nothing operator-only is waiting right now.']),
    ...(failedFixes.length ? failedFixes.map((item) => `- ${item.kind}: not fixed automatically (${item.error || 'unknown error'})`) : []),
    '',
    '## Recent trends',
    ...(trends.summaryLines.length ? trends.summaryLines.map((line) => `- ${line}`) : ['- No recent health-check trend data yet.']),
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
  const classified = Array.isArray(report.selfHeal?.classified) ? report.selfHeal.classified : [];
  const openIssues = Array.isArray(report.selfHeal?.openIssues) ? report.selfHeal.openIssues : [];
  const operatorCommands = Array.isArray(report.selfHeal?.operatorCommands) ? report.selfHeal.operatorCommands : [];
  const trends = report.trends || { summaryLines: [] };
  const isHealthy = blockers.length === 0 && failedFixes.length === 0 && openIssues.length === 0;
  const statusBadge = badge({ label: `${report.health.health} / ${report.health.severity}`, tone: severityTone(report.health.severity) });
  const nextActionBadge = badge({ label: blockers.length ? 'Action required' : 'Everything important looks healthy', tone: blockers.length ? 'danger' : 'success' });

  const summaryCard = card({
    title: 'Management summary',
    tone: 'info',
    contentHtml: `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">${statusBadge}${nextActionBadge}</div>
      <div style="margin:0 0 14px;padding:16px 18px;background:${isHealthy ? '#ecfdf5' : '#fff7ed'};border:1px solid ${isHealthy ? '#86efac' : '#fdba74'};border-radius:14px;">
        <div style="font-size:11px;color:${isHealthy ? '#166534' : '#9a3412'};text-transform:uppercase;letter-spacing:0.05em;font-weight:800;margin-bottom:6px;">Management summary</div>
        <div style="font-size:16px;font-weight:800;color:#0f172a;line-height:1.6;">${isHealthy ? 'Everything important is working normally. No action is needed right now.' : report.health.nextAction || nextActions[0]}</div>
      </div>
      ${kvTable([
        { label: 'Generated at', value: report.generatedAt },
        { label: 'Next step', value: report.health.nextAction || nextActions[0] },
        { label: 'Automatic fixes applied', value: String(healed.length) },
        { label: 'Issues still needing attention', value: String(blockers.length + openIssues.length + failedFixes.length) },
      ])}
    `,
  });

  const issuesCard = card({
    title: 'What needs attention now',
    tone: blockers.length ? 'warn' : 'success',
    contentHtml: `${blockers.length
      ? bulletList(blockers.map((item) => `[${item.code}] ${item.message}`))
      : '<p style="margin:0;color:#166534;font-weight:600;">No urgent exceptions are open right now.</p>'}
      <div style="height:12px"></div>
      ${bulletList(nextActions.map((item) => `Next action: ${item}`))}`,
  });

  const healedCard = card({
    title: 'What the system already handled',
    contentHtml: `${healed.length
      ? bulletList(healed.map((item) => `${item.kind}: ${item.applied ? 'applied automatically' : item.blocked || 'not applied'}`))
      : '<p style="margin:0;color:#6b7280;">No automatic fixes were needed this cycle.</p>'}
      ${classified.length ? `<div style="height:12px"></div><div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;margin-bottom:8px;">Detected symptoms</div>${bulletList(classified.map((item) => `[${item.category}] ${item.symptom}`))}` : ''}`,
  });

  const openIssuesCard = card({
    title: 'What still needs you',
    contentHtml: openIssues.length
      ? bulletList(openIssues.map((item, index) => `[${item.category}] ${item.summary}${operatorCommands[index] ? ` — Suggested command: ${operatorCommands[index].command}` : ''}`))
      : '<p style="margin:0;color:#166534;font-weight:600;">Nothing operator-only is waiting right now.</p>',
  });

  const failedFixesCard = card({
    title: 'Automatic fixes that did not finish cleanly',
    contentHtml: failedFixes.length
      ? bulletList(failedFixes.map((item) => `${item.kind}: not fixed automatically (${item.error || 'unknown error'})`))
      : '<p style="margin:0;color:#6b7280;">No failed automatic fixes were recorded.</p>',
  });

  const trendsCard = card({
    title: 'Recent trends',
    contentHtml: trends.summaryLines.length
      ? bulletList(trends.summaryLines)
      : '<p style="margin:0;color:#6b7280;">No recent health-check trend data yet.</p>',
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
    subtitle: 'Exceptions and next actions first, followed by self-heal output, operator guidance, trends, and lower-priority reference details.',
    accent: '#7c2d12',
    bodyHtml: `${summaryCard}${issuesCard}${healedCard}${openIssuesCard}${failedFixesCard}${trendsCard}${referenceCard}`,
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
  const priorEvents = readObservabilityEvents({ repoRoot });
  const plan = await buildSelfHealPlan({ portfolioDir, repoRoot });
  const recipeActions = Array.isArray(plan.healed) ? plan.healed : [];
  const selfHeal = {
    dryRun: !applySafeFixes,
    plannedActions: plan.actions,
    classified: plan.classified || [],
    openIssues: plan.openIssues || [],
    operatorCommands: (plan.openIssues || []).map((issue) => ({ category: issue.category, command: operatorCommandForIssue(issue, before.portfolio) })),
    actions: applySafeFixes ? [...recipeActions, ...(await attemptSafeSelfHeal({ portfolioDir }))] : recipeActions,
  };
  const after = applySafeFixes ? await collectHealthSignals({ portfolioDir, repoRoot }) : before;
  const trends = summarizeHealthTrends(priorEvents, { limit: 7 });
  const report = {
    schemaVersion: '2.1',
    portfolio: before.portfolio,
    generatedAt: new Date().toISOString(),
    before,
    after,
    health: after.health,
    selfHeal,
    trends,
  };
  const artifacts = writeHealthReportArtifacts(portfolioDir, report);
  appendObservabilityEvent({
    kind: 'health_check',
    portfolio: report.portfolio,
    health: report.health.health,
    severity: report.health.severity,
    blockerCount: report.health.blockerCount,
    classified: selfHeal.classified.map((item) => item.category),
    healed: selfHeal.actions.map((item) => item.kind),
    openIssues: selfHeal.openIssues.map((item) => item.category),
  }, { repoRoot });
  return { report, artifacts };
}

module.exports = {
  healthReportPaths,
  severityTone,
  operatorCommandForIssue,
  summarizeHealthTrends,
  collectHealthSignals,
  attemptSafeSelfHeal,
  buildHealthReportMarkdown,
  buildHealthReportHtml,
  writeHealthReportArtifacts,
  runHealthCheck,
};
