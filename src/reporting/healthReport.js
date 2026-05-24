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
  const latest = recent[recent.length - 1] || null;
  const blockedCount = Number(counts.blocked || 0);
  const warningCount = Number(counts.warning || 0) + Number(counts.attention_needed || 0);
  const healthyCount = Number(counts.healthy || 0);
  let direction = 'stable';
  if (!recent.length) direction = 'unknown';
  else if (latest?.health === 'blocked' || blockedCount >= Math.max(1, Math.ceil(recent.length / 2))) direction = 'worsening';
  else if (latest?.health === 'healthy' && healthyCount >= Math.max(1, recent.length - 1)) direction = 'stable';
  else if (latest?.health === 'healthy' && (blockedCount > 0 || warningCount > 0)) direction = 'improving';
  else if (warningCount > 0) direction = 'watching';

  let summary = 'No recent health-check trend data yet.';
  if (recent.length) {
    if (direction === 'stable') summary = 'Health direction is stable: recent checks stayed healthy or close to healthy, and no new operating risk is building.';
    else if (direction === 'improving') summary = 'Health direction is improving: earlier issues have eased and the latest posture is healthier than the recent baseline.';
    else if (direction === 'worsening') summary = `Health direction is worsening: ${blockedCount} of the last ${recent.length} checks showed blocked posture or the latest run is still blocked.`;
    else if (direction === 'watching') summary = 'Health direction needs watching: the system is running, but recent checks show recurring attention signals that should not be ignored.';
  }

  return {
    recent,
    counts,
    direction,
    summary,
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
  const trends = report.trends || { direction: 'unknown', summary: 'No recent health-check trend data yet.' };
  const isHealthy = blockers.length === 0 && failedFixes.length === 0 && openIssues.length === 0;
  const attentionSummary = blockers.length
    ? blockers[0].message
    : openIssues.length
      ? openIssues[0].summary
      : failedFixes.length
        ? `${failedFixes[0].kind}: not fixed automatically (${failedFixes[0].error || 'unknown error'})`
        : 'No urgent exceptions are open right now.';
  const handledSummary = healed.length
    ? `The system already handled ${healed.length} issue(s) automatically.`
    : 'No automatic fixes were needed this cycle.';

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
    '## What matters now',
    `- ${attentionSummary}`,
    `- Next action: ${report.health.nextAction || nextActions[0]}`,
    '',
    '## What the system already handled',
    `- ${handledSummary}`,
    ...(classified.length ? [`- Main detected symptom: ${classified[0].symptom}`] : []),
    ...(failedFixes.length ? failedFixes.map((item) => `- ${item.kind}: not fixed automatically (${item.error || 'unknown error'})`) : []),
    '',
    '## Health direction',
    `- ${trends.summary}`,
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
  const trends = report.trends || { direction: 'unknown', summary: 'No recent health-check trend data yet.' };
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

  const attentionSummary = blockers.length
    ? blockers[0].message
    : openIssues.length
      ? openIssues[0].summary
      : failedFixes.length
        ? `${failedFixes[0].kind}: not fixed automatically (${failedFixes[0].error || 'unknown error'})`
        : 'No urgent exceptions are open right now.';

  const issuesCard = card({
    title: 'What matters now',
    tone: blockers.length || openIssues.length || failedFixes.length ? 'warn' : 'success',
    contentHtml: `
      <div style="margin:0 0 12px;padding:16px 18px;background:${blockers.length || openIssues.length || failedFixes.length ? '#fff7ed' : '#ecfdf5'};border:1px solid ${blockers.length || openIssues.length || failedFixes.length ? '#fdba74' : '#86efac'};border-radius:14px;">
        <div style="font-size:16px;font-weight:700;line-height:1.6;color:#0f172a;">${attentionSummary}</div>
      </div>
      <div style="font-size:14px;line-height:1.6;color:#334155;"><strong>Next action:</strong> ${report.health.nextAction || nextActions[0]}</div>`,
  });

  const handledSummary = healed.length
    ? `The system already handled ${healed.length} issue(s) automatically.`
    : 'No automatic fixes were needed this cycle.';

  const healedCard = card({
    title: 'What the system already handled',
    contentHtml: `
      <div style="font-size:14px;line-height:1.6;color:#334155;">${handledSummary}</div>
      ${classified.length ? `<div style="margin-top:10px;font-size:14px;line-height:1.6;color:#334155;"><strong>Main detected symptom:</strong> ${classified[0].symptom}</div>` : ''}
      ${failedFixes.length ? `<div style="margin-top:10px;font-size:14px;line-height:1.6;color:#7c2d12;"><strong>Still unresolved:</strong> ${failedFixes[0].kind}: not fixed automatically (${failedFixes[0].error || 'unknown error'})</div>` : ''}`,
  });

  const trendsCard = card({
    title: 'Health direction',
    contentHtml: `<div style="font-size:14px;line-height:1.7;color:#334155;"><strong>${String(trends.direction || 'unknown').replace(/^./, (c) => c.toUpperCase())}.</strong> ${trends.summary}</div>`,
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
    subtitle: 'Short investor-facing health summary: what matters now, what was already handled, and whether the overall direction is stable or changing.',
    accent: '#7c2d12',
    bodyHtml: `${summaryCard}${issuesCard}${healedCard}${trendsCard}${referenceCard}`,
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
