const fs = require('fs');
const { writeJsonIfChanged, writeTextIfChanged } = require('./artifactWriter');
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
  const blockedCount = Number(counts.blocked || 0) + Number(counts.paused || 0);
  const degradedCount = Number(counts.degraded || 0) + Number(counts.attention_needed || 0);
  const healthyCount = Number(counts.healthy || 0);
  let direction = 'stable';
  if (!recent.length) direction = 'unknown';
  else if (latest?.health === 'blocked' || latest?.health === 'paused' || blockedCount >= Math.max(1, Math.ceil(recent.length / 2))) direction = 'worsening';
  else if (latest?.health === 'healthy' && healthyCount >= Math.max(1, recent.length - 1)) direction = 'stable';
  else if (latest?.health === 'healthy' && (blockedCount > 0 || degradedCount > 0)) direction = 'improving';
  else if (degradedCount >= Math.max(1, recent.length - 1)) direction = 'watching';
  else if (degradedCount > 0 || blockedCount > 0) direction = 'watching';

  let summary = 'No recent health-check trend data yet.';
  if (recent.length) {
    if (direction === 'stable') summary = 'Health direction is stable: recent checks stayed healthy, and no new operating risk is building.';
    else if (direction === 'improving') summary = 'Health direction is improving: earlier issues have eased and the latest posture is healthier than the recent baseline.';
    else if (direction === 'worsening') summary = `Health direction is worsening: ${blockedCount} of the last ${recent.length} checks showed blocked or paused posture.`;
    else if (direction === 'watching') summary = `Health direction needs watching: ${degradedCount} of the last ${recent.length} checks show degraded or attention-needed state. No hard blocker, but recurring signals should not be ignored.`;
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
  const recoveryLadders = Array.isArray(report.selfHeal?.recoveryLadders) ? report.selfHeal.recoveryLadders : [];
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

  const recoveryGuidanceLines = [];
  if (openIssues.length > 0 && recoveryLadders.length > 0) {
    recoveryGuidanceLines.push('');
    recoveryGuidanceLines.push('## Recovery guidance');
    for (const entry of recoveryLadders) {
      recoveryGuidanceLines.push('');
      recoveryGuidanceLines.push(`### ${entry.category}`);
      for (const step of entry.ladder) {
        recoveryGuidanceLines.push(`${step.rank}. ${step.description}`);
        if (step.command) {
          recoveryGuidanceLines.push(`   - Command: \`${step.command}\``);
        } else {
          recoveryGuidanceLines.push('   - Manual step (no command)');
        }
      }
    }
  }

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
    ...recoveryGuidanceLines,
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

function appendHealthTrend(report, { repoRoot = process.cwd() } = {}) {
  // Phase I-2: append one line per health check to runtime/overview/health-trend.jsonl
  // for trend visibility (dashboard reads the tail; ops can grep history).
  // Best-effort: failure to append must NOT bubble up and break the health check.
  try {
    const trendDir = path.join(repoRoot, 'runtime', 'overview');
    if (!fs.existsSync(trendDir)) fs.mkdirSync(trendDir, { recursive: true });
    const trendPath = path.join(trendDir, 'health-trend.jsonl');
    const blockers = Array.isArray(report.health?.blockers) ? report.health.blockers : [];
    const blockerCodes = blockers.map((b) => b && b.code).filter(Boolean);
    const entry = {
      ts: report.generatedAt || new Date().toISOString(),
      portfolio: report.portfolio || 'unknown',
      state: report.health?.state || 'healthy',
      summary: report.health?.summary || '',
      blockerCodes,
      severity: report.health?.severity || null,
    };
    fs.appendFileSync(trendPath, JSON.stringify(entry) + '\n');
  } catch (err) {
    // swallow — trend log is observability, not a hard requirement
  }
}

function readHealthTrendTail({ repoRoot = process.cwd(), portfolio = null, limit = 10 } = {}) {
  // Used by the dashboard to summarize recent health verdicts.
  try {
    const trendPath = path.join(repoRoot, 'runtime', 'overview', 'health-trend.jsonl');
    if (!fs.existsSync(trendPath)) return [];
    const text = fs.readFileSync(trendPath, 'utf8');
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    const rows = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (portfolio && obj.portfolio !== portfolio) continue;
        rows.push(obj);
      } catch { /* skip malformed line */ }
    }
    return rows.slice(-limit);
  } catch { return []; }
}

function summarizeHealthTrendTail(tail = []) {
  if (!tail.length) return null;
  const last = tail[tail.length - 1];
  // Count consecutive cycles ending with the same state
  let consecutive = 0;
  for (let i = tail.length - 1; i >= 0; i--) {
    if (tail[i].state === last.state) consecutive++;
    else break;
  }
  return {
    currentState: last.state,
    summary: last.summary,
    consecutiveSame: consecutive,
    sinceTs: tail[tail.length - consecutive].ts,
    blockerCodes: last.blockerCodes || [],
    totalSampleCount: tail.length,
  };
}

function writeHealthReportArtifacts(portfolioDir, report) {
  const paths = healthReportPaths(portfolioDir);
  const markdown = buildHealthReportMarkdown(report);
  const html = buildHealthReportHtml(report);
  writeJsonIfChanged(paths.jsonPath, report);
  writeTextIfChanged(paths.mdPath, markdown);
  writeTextIfChanged(paths.htmlPath, html);
  return { ...paths, markdown, html };
}

async function runHealthCheck({ portfolioDir, repoRoot = process.cwd(), applySafeFixes = true, secondPass = true }) {
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
    recoveryLadders: Array.isArray(plan.recoveryLadders) ? plan.recoveryLadders : [],
    actions: applySafeFixes ? [...recipeActions, ...(await attemptSafeSelfHeal({ portfolioDir }))] : recipeActions,
  };
  let after = applySafeFixes ? await collectHealthSignals({ portfolioDir, repoRoot }) : before;

  // Phase J — second-pass autofix when post-pass-1 verdict is still attention/critical.
  if (applySafeFixes && secondPass) {
    const postPass1State = String(after?.health?.state || '').toLowerCase();
    if (postPass1State === 'attention' || postPass1State === 'critical') {
      try {
        const { runSecondPassFixers } = require('./healthFixers');
        const pass2 = await runSecondPassFixers({ report: { health: after.health, portfolio: before.portfolio }, portfolioDir, repoRoot });
        selfHeal.secondPass = pass2;
        if (pass2 && Array.isArray(pass2.attempted) && pass2.attempted.some((a) => a.ok)) {
          // At least one fixer reported success — re-collect signals so the verdict reflects the new state.
          after = await collectHealthSignals({ portfolioDir, repoRoot });
        }
      } catch (err) {
        selfHeal.secondPass = { error: err.message || String(err), attempted: [], rateLimited: [], skipped: [] };
      }
    } else {
      selfHeal.secondPass = { skippedReason: 'state_' + postPass1State, attempted: [], rateLimited: [], skipped: [] };
    }
  }

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
  appendHealthTrend(report, { repoRoot });
  return { report, artifacts };
}


function buildBb8Prompt(report, summary, triedLines) {
  // Build a self-contained prompt Graham can paste back to bb8 in any session.
  const portfolio = (report.portfolio || 'etf').toUpperCase();
  const blockerCodes = (report.health?.blockers || []).map((b) => b.code).filter(Boolean);
  const lines = [
    'Health monitor flagged ' + portfolio + ' as ' + (report.health?.state || 'attention') + '.',
    '',
    'Symptom: ' + summary,
    blockerCodes.length ? 'Blocker codes: ' + blockerCodes.join(', ') : null,
    '',
    'Already tried this cycle:',
    ...triedLines.map((l) => l.replace(/^- /, '  - ')),
    '',
    'Please:',
    '  1. Read runtime/overview/health-report.json + portfolio/' + (report.portfolio || 'etf') + '/health-report.json',
    '  2. Diagnose the root cause (not just the symptom)',
    '  3. Fix it or tell me exactly what to do — no "review the report" deflections',
  ].filter((x) => x !== null);
  return lines.join('\n');
}

function buildEscalationEmail(report) {
  const state = report.health?.state || 'attention';
  const summary = report.health?.summary || 'Health issue detected.';
  const canonicalNextAction = report.health?.canonicalNextAction || null;
  const portfolio = report.portfolio || 'etf';
  const generatedAt = report.generatedAt || new Date().toISOString();

  // What bb8 already tried — pass 1
  const healed = Array.isArray(report.selfHeal?.actions) ? report.selfHeal.actions.filter((a) => a.ok) : [];
  const failedFixes = Array.isArray(report.selfHeal?.actions) ? report.selfHeal.actions.filter((a) => !a.ok) : [];
  const triedLines = [];
  if (healed.length) {
    for (const h of healed) triedLines.push('- ' + h.kind.replace(/_/g, ' '));
  }
  if (failedFixes.length) {
    for (const f of failedFixes) triedLines.push('- ' + f.kind.replace(/_/g, ' ') + ' (failed: ' + (f.error || 'unknown') + ')');
  }

  // What bb8 tried — pass 2 (Phase J)
  const pass2 = report.selfHeal?.secondPass;
  if (pass2 && Array.isArray(pass2.attempted) && pass2.attempted.length > 0) {
    triedLines.push('- [pass 2]:');
    for (const a of pass2.attempted) {
      const status = a.ok ? 'ok' : 'failed: ' + (a.error || 'unknown');
      triedLines.push('- ' + (a.label || a.fixerKey || a.code) + ' (' + status + ')');
    }
  }
  if (pass2 && Array.isArray(pass2.rateLimited) && pass2.rateLimited.length > 0) {
    for (const r of pass2.rateLimited) {
      triedLines.push('- ' + (r.fixerKey || r.code) + ' (rate-limited until ' + (r.nextEligibleAt || '?') + ')');
    }
  }

  if (!triedLines.length) triedLines.push('- No automatic fixes were applicable this cycle.');

  // Build the bb8 prompt (always; useful even when canonicalNextAction is set)
  const bb8Prompt = buildBb8Prompt(report, summary, triedLines);

  // Subject
  const stateLabel = state === 'critical' ? 'CRITICAL' : 'attention needed';
  const subject = '[Portfolio] ' + portfolio.toUpperCase() + ' ' + stateLabel + ' — ' + summary.slice(0, 80);

  // Plain text body
  const text = [
    portfolio.toUpperCase() + ' portfolio — ' + stateLabel,
    'Generated ' + generatedAt.slice(0, 19).replace('T', ' ') + ' UTC.',
    '',
    'What\'s wrong',
    '  ' + summary,
    '',
    'What bb8 already tried',
    ...triedLines.map((l) => '  ' + l),
    '',
    'What to do',
    canonicalNextAction ? '  ' + canonicalNextAction : '  Paste the prompt below to bb8 in a fresh session.',
    '',
    '─── Prompt for bb8 ───',
    bb8Prompt,
    '─────────────────────',
    '',
    'Full report: runtime/overview/health-report.html',
  ].join('\n');

  // HTML body — wrap prompt in a copyable <pre> block
  const escapeHtml = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = page({
    title: portfolio.toUpperCase() + ' ' + stateLabel,
    bodyHtml: [
      '<div style="padding:24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">',
      '<h1 style="font-size:20px;margin:0 0 16px;">' + portfolio.toUpperCase() + ' — ' + stateLabel + '</h1>',
      '<p style="font-size:13px;color:#6b7280;margin:0 0 20px;">Generated ' + generatedAt.slice(0, 19).replace('T', ' ') + ' UTC</p>',
      '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:16px;margin-bottom:20px;">',
      '<div style="font-size:11px;color:#991b1b;text-transform:uppercase;font-weight:700;letter-spacing:0.04em;margin-bottom:6px;">What\'s wrong</div>',
      '<div style="font-size:15px;font-weight:600;color:#1e293b;">' + escapeHtml(summary) + '</div>',
      '</div>',
      '<div style="background:#f0f9ff;border:1px solid #93c5fd;border-radius:12px;padding:16px;margin-bottom:20px;">',
      '<div style="font-size:11px;color:#1e40af;text-transform:uppercase;font-weight:700;letter-spacing:0.04em;margin-bottom:6px;">What bb8 already tried</div>',
      '<ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.8;color:#334155;">',
      ...triedLines.map((l) => '<li>' + escapeHtml(l.replace(/^- /, '')) + '</li>'),
      '</ul>',
      '</div>',
      '<div style="background:#ecfdf5;border:1px solid #86efac;border-radius:12px;padding:16px;margin-bottom:20px;">',
      '<div style="font-size:11px;color:#166534;text-transform:uppercase;font-weight:700;letter-spacing:0.04em;margin-bottom:6px;">What to do</div>',
      '<div style="font-size:14px;color:#1e293b;margin-bottom:12px;">' + (canonicalNextAction ? escapeHtml(canonicalNextAction) : 'Copy the prompt below and paste it to bb8 in a fresh session.') + '</div>',
      '<div style="font-size:11px;color:#475569;text-transform:uppercase;font-weight:600;margin-bottom:6px;">Prompt for bb8 (copy &amp; paste)</div>',
      '<pre style="background:#0f172a;color:#e2e8f0;border-radius:8px;padding:14px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word;margin:0;">' + escapeHtml(bb8Prompt) + '</pre>',
      '</div>',
      '</div>',
    ].join('\n'),
  });

  return { subject, text, html, bb8Prompt };
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
  buildEscalationEmail,
  writeHealthReportArtifacts,
  appendHealthTrend,
  readHealthTrendTail,
  summarizeHealthTrendTail,
  runHealthCheck,
};
