const path = require('path');
const { page, card, badge, metricGrid, dataTable, bulletList, formatCurrency, formatPercent, escapeHtml } = require('./emailHtml');
const { collectPortfolioSummary } = require('./summaryArtifacts');
const { fetchCronHealth } = require('./cronJobsFetcher');
const { readNetLiqHistory, lastNDays } = require('./historyDigest');
const { buildSparklineSvg } = require('./sparkline');
const { effectiveDeliveryPolicy, reportDeliveryStatus } = require('./deliveryPolicy');
const { sendEmailMessage } = require('./emailDelivery');

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
    contentHtml: `
      <div style="margin-bottom:12px;color:#6b7280;font-size:13px;">Last ${series.length || 0} end-of-day snapshot(s).</div>
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
    contentHtml: bulletList(items),
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
      contentHtml: `
        <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          ${badge({ label: String(summary.status?.health || 'unknown').replace(/_/g, ' '), tone: summary.status?.health === 'healthy' ? 'success' : summary.status?.health === 'blocked' ? 'danger' : 'warn' })}
          ${badge({ label: String(summary.status?.executionPosture || 'unknown').replace(/_/g, ' '), tone: String(summary.status?.executionPosture || '').includes('ready') ? 'success' : 'warn' })}
          ${badge({ label: String(frequency).toLowerCase() === 'weekly' ? 'weekly digest' : 'daily digest', tone: 'info' })}
        </div>
        ${metricGrid(metrics)}
      `,
    }),
    renderSparklineCard(portfolioDir),
    renderAllocationCard(summary),
    renderInstrumentHealthCard(summary),
    renderCronHealthCard(resolvedCronHealth),
    renderWorkflowCard(summary, deliveryStatus),
  ].join('');

  const html = page({
    eyebrow: 'OpenClaw Portfolio Digest',
    title: `${portfolioName} ${String(frequency).toLowerCase() === 'weekly' ? 'weekly' : 'daily'} portfolio digest`,
    subtitle: 'Operational summary with portfolio drift, instrument health, cron health, and next actions.',
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
