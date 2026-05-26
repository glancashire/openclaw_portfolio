const path = require('path');
const { page, card, badge, metricGrid, dataTable, bulletList, formatCurrency, formatPercent, escapeHtml } = require('./emailHtml');
const { collectPortfolioSummary } = require('./summaryArtifacts');
const { fetchCronHealth } = require('./cronJobsFetcher');
const { readNetLiqHistory, lastNDays } = require('./historyDigest');
const { buildSparklineSvg } = require('./sparkline');
const { effectiveDeliveryPolicy, reportDeliveryStatus } = require('./deliveryPolicy');
const { sendEmailMessage } = require('./emailDelivery');
const fs = require('fs');
const { computeRebalancePlan } = require('../../lib/rebalanceAnalyzer');
const { parseAllocationTargets, parseHoldings, applyAliases } = require('../../lib/portfolioMarkdown');
const { assessPortfolio } = require('../../lib/aiAssessment');

function resolveDigestRecipients(policy = {}, env = process.env) {
  const configured = Array.isArray(policy.emailRecipients)
    ? policy.emailRecipients.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (configured.length) return configured;
  const fallback = String(env.MAILGUN_RECIPIENT || '').trim();
  return fallback ? [fallback] : [];
}

function buildDigestSubject({ portfolioName, frequency = 'daily', generatedAt = new Date().toISOString() }) {
  const date = String(generatedAt).slice(0, 10);
  if (String(frequency).toLowerCase() === 'weekly') {
    return `[${portfolioName}] Weekly portfolio digest — week of ${date}`;
  }
  return `[${portfolioName}] Daily portfolio digest — ${date}`;
}

function toneForCronSeverity(severity = 'ok') {
  if (severity === 'critical' || severity === 'alert') return 'danger';
  if (severity === 'warning' || severity === 'stale') return 'warn';
  return 'success';
}

function summarizeInstrumentHealth(summary = {}) {
  const allocationRows = Array.isArray(summary.allocation) ? summary.allocation : [];
  const allocationByAssetClass = new Map(allocationRows.map((row) => [String(row.assetClass || ''), row]));
  const blockedByTicker = new Map((summary.execution?.blockedRows || []).map((row) => [String(row.tickerOrIsin || ''), row]));
  return (summary.instruments || []).map((instrument) => {
    const allocation = allocationByAssetClass.get(String(instrument.assetClass || '')) || null;
    const blocked = blockedByTicker.get(String(instrument.tickerOrIsin || '')) || null;
    const latestProposal = instrument.latestProposal || null;
    return {
      tickerOrIsin: instrument.tickerOrIsin,
      name: instrument.name,
      assetClass: instrument.assetClass,
      targetPct: Number(instrument.targetPct || 0),
      driftPct: allocation ? Number(allocation.driftPct || 0) : null,
      allocationStatus: allocation?.status || 'unknown',
      proposalStatus: latestProposal?.status || 'none',
      approval: latestProposal?.approval || 'n/a',
      blockReason: blocked?.blockReason || blocked?.blockCode || '',
    };
  });
}

function renderSparklineCard(portfolioDir) {
  const series = lastNDays(readNetLiqHistory(portfolioDir), 30);
  const values = series.map((row) => Number(row.totalChf || 0)).filter(Number.isFinite);
  const current = values.length ? values[values.length - 1] : null;
  const previous = values.length > 1 ? values[0] : null;
  const delta = Number.isFinite(current) && Number.isFinite(previous) ? Number((current - previous).toFixed(2)) : null;
  const spark = buildSparklineSvg(values, { width: 720, height: 120, strokeColor: '#2563eb', fillColor: 'rgba(37, 99, 235, 0.12)', strokeWidth: 2 });
  return card({
    title: 'Portfolio trend',
    tone: 'surface',
    contentHtml: `
      <div style="margin-bottom:10px;color:#475569;font-size:13px;line-height:1.5;">Last ${series.length || 0} end-of-day snapshot(s).</div>
      <div style="padding:8px 0 4px;">${spark}</div>
      <div style="margin-top:12px;font-size:14px;color:#111827;">
        <strong>${Number.isFinite(current) ? formatCurrency(current, 'CHF') : '—'}</strong>
        <span style="color:#6b7280;"> current net liq</span>
        ${Number.isFinite(delta) ? `<span style="margin-left:10px;color:${delta >= 0 ? '#166534' : '#991b1b'};">${delta >= 0 ? '+' : ''}${formatCurrency(delta, 'CHF')} vs earliest point</span>` : ''}
      </div>
    `,
  });
}

function renderAllocationCard(summary = {}) {
  const rows = (summary.allocation || []).map((row) => [
    escapeHtml(row.assetClass || '—'),
    escapeHtml(formatPercent(row.currentPct || 0)),
    escapeHtml(formatPercent(row.targetPct || 0)),
    escapeHtml(formatPercent(row.driftPct || 0)),
    escapeHtml(row.status || 'unknown'),
  ]);
  return card({
    title: 'Allocation drift',
    tone: 'surface',
    contentHtml: dataTable({
      columns: [
        { label: 'Sleeve' },
        { label: 'Current', align: 'right' },
        { label: 'Target', align: 'right' },
        { label: 'Drift', align: 'right' },
        { label: 'Status' },
      ],
      rows,
    }),
  });
}

function renderInstrumentHealthCard(summary = {}) {
  const rows = summarizeInstrumentHealth(summary).map((row) => [
    escapeHtml(row.tickerOrIsin || '—'),
    escapeHtml(row.assetClass || '—'),
    escapeHtml(Number.isFinite(row.driftPct) ? formatPercent(row.driftPct) : '—'),
    escapeHtml(row.proposalStatus || 'none'),
    escapeHtml(row.approval || 'n/a'),
    escapeHtml(row.blockReason || '—'),
  ]);
  return card({
    title: 'Instrument health',
    tone: 'surface',
    contentHtml: dataTable({
      columns: [
        { label: 'Instrument' },
        { label: 'Sleeve' },
        { label: 'Drift', align: 'right' },
        { label: 'Proposal' },
        { label: 'Approval' },
        { label: 'Block / note' },
      ],
      rows,
    }),
  });
}

function renderCronHealthCard(cronHealth = {}) {
  const rows = (cronHealth.jobs || []).slice(0, 8).map((job) => [
    escapeHtml(job.name || 'unnamed'),
    badge({ label: job.severity || 'ok', tone: toneForCronSeverity(job.severity) }),
    escapeHtml(String(job.consecutiveErrors ?? 0)),
    escapeHtml(job.lastRunAgeHours == null ? 'n/a' : `${job.lastRunAgeHours.toFixed(1)}h`),
    escapeHtml(job.lastError ? String(job.lastError).slice(0, 120) : '—'),
  ]);
  return card({
    title: 'Cron health',
    tone: 'surface',
    contentHtml: `
      <div style="margin-bottom:12px;display:flex;gap:10px;flex-wrap:wrap;">
        ${badge({ label: `${cronHealth.healthy || 0}/${cronHealth.total || 0} healthy`, tone: (cronHealth.failing || 0) > 0 ? 'warn' : 'success' })}
        ${badge({ label: `${cronHealth.failing || 0} failing`, tone: (cronHealth.failing || 0) > 0 ? 'danger' : 'success' })}
      </div>
      ${dataTable({
        columns: [
          { label: 'Job' },
          { label: 'Severity' },
          { label: 'Errors', align: 'right' },
          { label: 'Age', align: 'right' },
          { label: 'Last error' },
        ],
        rows,
      })}
    `,
  });
}

function renderWorkflowCard(summary = {}, deliveryStatus = {}) {
  const items = [];
  if (summary.recommendedNextStep) items.push(`Next step: ${summary.recommendedNextStep}`);
  for (const item of (summary.pendingActions || []).slice(0, 5)) items.push(item);
  for (const item of (deliveryStatus.pendingActions || []).slice(0, 3)) {
    if (!items.includes(item)) items.push(item);
  }
  return card({
    title: 'Open issues and workflow',
    tone: 'warn',
    contentHtml: bulletList(items),
  });
}

function tryRender(fn, fallbackComment = '') {
  try { return fn() || ''; } catch (err) {
    return `<!-- digest-section error: ${String(err.message).replace(/[<>]/g, '')} -->${fallbackComment}`;
  }
}

function buildRebalancePlanForDigest(portfolioDir) {
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const holdingsPath  = path.join(portfolioDir, 'holdings.md');
  if (!fs.existsSync(portfolioPath) || !fs.existsSync(holdingsPath)) return null;
  const targets = parseAllocationTargets(fs.readFileSync(portfolioPath, 'utf8'));
  const { holdings: raw, cashChf } = parseHoldings(fs.readFileSync(holdingsPath, 'utf8'));
  const holdings = applyAliases(raw, targets._aliases);
  return computeRebalancePlan({
    holdings, targets, cashChf,
    fxRates: { EUR: 0.96, USD: 0.88, GBP: 1.15 },
  });
}

function renderRebalanceSnapshotCard(plan) {
  if (!plan || !Array.isArray(plan.legs) || plan.legs.length === 0) return '';
  const rows = plan.legs.map((l) => {
    const driftColor = Math.abs(l.driftPct) < 0.5 ? '#6b7280' : l.driftPct > 0 ? '#991b1b' : '#0f766e';
    const driftCell = `<span style="color:${driftColor};font-weight:600;">${l.driftPct > 0 ? '+' : ''}${l.driftPct.toFixed(2)}pp</span>`;
    return [
      escapeHtml(l.symbol),
      escapeHtml(formatCurrency(l.valueChf, 'CHF')),
      escapeHtml(`${l.actualPct.toFixed(2)}%`),
      escapeHtml(`${l.targetPct}%`),
      driftCell,
      escapeHtml(formatCurrency(l.gapChf, 'CHF')),
    ];
  });
  const overshoot = plan.scenarios.sell_overshoot;
  const summaryLine = (overshoot.sellsChf > 0 || overshoot.buysChf > 0)
    ? `Sell-overshoot scenario: sells CHF ${overshoot.sellsChf}, buys CHF ${overshoot.buysChf}; cash needed CHF ${overshoot.cashNeededChf}; leftover drift ${overshoot.leftoverDriftPp}pp.`
    : 'No rebalance action above min-trade-size today.';
  return card({
    title: 'Drift vs target',
    tone: 'surface',
    contentHtml: `
      ${dataTable({
        columns: [
          { label: 'Symbol' },
          { label: 'Value', align: 'right' },
          { label: 'Actual %', align: 'right' },
          { label: 'Target %', align: 'right' },
          { label: 'Drift', align: 'right' },
          { label: 'Gap CHF', align: 'right' },
        ],
        rows,
      })}
      <div style="margin-top:12px;font-size:13px;color:#374151;">${escapeHtml(summaryLine)}</div>
    `,
  });
}

function renderAiAssessmentCard(assessment) {
  if (!assessment || !assessment.lead) return '';
  const chips = (assessment.tags || []).map((tag) => {
    const tone = tag === 'drift_alert' ? 'danger'
      : tag === 'nav_drawdown' ? 'danger'
      : tag === 'awaiting_approval' ? 'warn'
      : tag === 'cash_above_target' ? 'info'
      : tag === 'cash_below_target' ? 'warn'
      : 'success';
    return badge({ label: tag.replace(/_/g, ' '), tone });
  }).join(' ');
  const bullets = (assessment.details || []).map((d) => `<li style="margin:4px 0;">${escapeHtml(d.summary)}</li>`).join('');
  return card({
    title: 'Assessment',
    tone: 'info',
    contentHtml: `
      <div style="margin-bottom:10px;font-size:15px;line-height:1.55;color:#0f172a;font-weight:600;">${escapeHtml(assessment.lead)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">${chips}</div>
      <ul style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.5;">${bullets}</ul>
    `,
  });
}

async function buildDashboardDigest({ portfolioDir, frequency = 'daily', generatedAt = new Date().toISOString(), cronHealth = null }) {
  const portfolioName = path.basename(portfolioDir);
  const summary = await collectPortfolioSummary({ portfolioDir });
  const deliveryStatus = reportDeliveryStatus({ portfolioDir });
  const resolvedCronHealth = cronHealth || fetchCronHealth();
  const metrics = [
    { label: 'Portfolio value', value: formatCurrency(summary.holdings?.totalValueChf, 'CHF'), detail: summary.holdings?.lastSyncAt ? `Last sync ${summary.holdings.lastSyncAt}` : null },
    { label: 'Cash', value: formatCurrency(summary.holdings?.cashChf, 'CHF'), detail: `Base ${summary.holdings?.baseCurrency || 'CHF'}` },
    { label: 'Pending approvals', value: String(summary.approvals?.pendingApprovalCount || 0), detail: `${summary.approvals?.staleApprovalCount || 0} stale` },
    { label: 'Operator queue', value: String(summary.operatorQueue?.summary?.total || 0), detail: `${summary.blockers?.count || 0} blocker(s)` },
  ];
  const bodyHtml = [
    card({
      title: 'Digest summary',
      tone: 'info',
      contentHtml: `
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          ${badge({ label: String(summary.status?.health || 'unknown').replace(/_/g, ' '), tone: summary.status?.health === 'healthy' ? 'success' : summary.status?.health === 'blocked' ? 'danger' : 'warn' })}
          ${badge({ label: String(summary.status?.executionPosture || 'unknown').replace(/_/g, ' '), tone: String(summary.status?.executionPosture || '').includes('ready') ? 'success' : 'warn' })}
          ${badge({ label: String(frequency).toLowerCase() === 'weekly' ? 'weekly digest' : 'daily digest', tone: 'info' })}
        </div>
        ${metricGrid(metrics)}
      `,
    }),
    renderSparklineCard(portfolioDir),
    tryRender(() => {
      const plan = buildRebalancePlanForDigest(portfolioDir);
      if (!plan) return '';
      const navHistory = lastNDays(readNetLiqHistory(portfolioDir), 14);
      const assessment = assessPortfolio({ plan, navHistory, summary });
      return renderRebalanceSnapshotCard(plan) + renderAiAssessmentCard(assessment);
    }),
    renderAllocationCard(summary),
    renderInstrumentHealthCard(summary),
    renderCronHealthCard(resolvedCronHealth),
    renderWorkflowCard(summary, deliveryStatus),
  ].join('');

  const html = page({
    eyebrow: 'OpenClaw Portfolio Digest',
    title: `${portfolioName} ${String(frequency).toLowerCase() === 'weekly' ? 'weekly' : 'daily'} portfolio digest`,
    subtitle: 'A tighter operational snapshot: value, drift, health, cron posture, and what needs attention next.',
    accent: '#0f172a',
    bodyHtml,
    footer: 'OpenClaw Portfolio Manager • Digest email',
  });

  const textSections = [
    `${portfolioName} ${frequency} portfolio digest`,
    '',
    `Portfolio value: ${formatCurrency(summary.holdings?.totalValueChf, 'CHF')}`,
    `Cash: ${formatCurrency(summary.holdings?.cashChf, 'CHF')}`,
    `Pending approvals: ${summary.approvals?.pendingApprovalCount || 0}`,
    `Operator queue: ${summary.operatorQueue?.summary?.total || 0}`,
    `Cron health: ${resolvedCronHealth.healthy || 0}/${resolvedCronHealth.total || 0} healthy, ${resolvedCronHealth.failing || 0} failing`,
    '',
    'Open issues / next actions',
    ...((summary.pendingActions || []).slice(0, 8).map((item) => `- ${item}`)),
  ];

  return {
    portfolioName,
    frequency,
    generatedAt,
    subject: buildDigestSubject({ portfolioName, frequency, generatedAt }),
    summary,
    cronHealth: resolvedCronHealth,
    deliveryStatus,
    html,
    text: textSections.join('\n'),
  };
}

async function sendDashboardDigest({ portfolioDir, frequency = 'daily', generatedAt = new Date().toISOString(), dryRun = false, sendEmailImpl = sendEmailMessage, cronHealth = null, env = process.env }) {
  const digest = await buildDashboardDigest({ portfolioDir, frequency, generatedAt, cronHealth });
  const policy = effectiveDeliveryPolicy(portfolioDir);
  const recipients = resolveDigestRecipients(policy, env);
  if (!recipients.length) {
    return {
      attempted: false,
      sent: false,
      reason: 'no_recipients_configured',
      subject: digest.subject,
      recipients: [],
      digest,
    };
  }
  if (dryRun) {
    return {
      attempted: false,
      sent: false,
      dryRun: true,
      subject: digest.subject,
      recipients,
      digest,
    };
  }
  const result = await sendEmailImpl({
    policy: { ...policy, emailRecipients: recipients },
    subject: digest.subject,
    text: digest.text,
    html: digest.html,
  });
  return {
    attempted: true,
    sent: true,
    subject: digest.subject,
    recipients,
    provider: policy.emailProvider || 'mailgun',
    result,
    digest,
  };
}

module.exports = {
  resolveDigestRecipients,
  buildDigestSubject,
  summarizeInstrumentHealth,
  buildDashboardDigest,
  sendDashboardDigest,
};
