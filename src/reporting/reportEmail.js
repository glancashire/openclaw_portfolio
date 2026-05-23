const fs = require('fs');
const path = require('path');
const {
  escapeHtml,
  page,
  card,
  badge,
  bulletList,
  metricGrid,
  kvTable,
  formatCurrency,
  formatPercent,
} = require('./emailHtml');

function buildReportEmailSubject({ portfolioName, period, generatedAt = null }) {
  const stamp = generatedAt ? String(generatedAt).slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `[Portfolio] ${portfolioName} ${period} overview (${stamp})`;
}

function formatSignedCurrency(value, currency = 'CHF') {
  if (!Number.isFinite(Number(value))) return '—';
  const numeric = Number(value);
  const prefix = numeric > 0 ? '+' : '';
  return `${prefix}${formatCurrency(numeric, currency)}`;
}

function safePercent(value, base) {
  const numericValue = Number(value);
  const numericBase = Number(base);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericBase) || numericBase === 0) return null;
  return Number(((numericValue / numericBase) * 100).toFixed(1));
}

function parseStatusTone(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'healthy' || normalized === 'ready') return 'success';
  if (normalized === 'attention_needed' || normalized === 'rebalance_needed' || normalized === 'warning') return 'warn';
  if (normalized === 'blocked' || normalized === 'degraded' || normalized === 'needs_operator_attention' || normalized === 'paused') return 'danger';
  return 'info';
}

function parseQueueItems(deliveryStatus = null) {
  const pending = Array.isArray(deliveryStatus?.pendingActions) ? deliveryStatus.pendingActions : [];
  return pending.map((item) => String(item));
}

function buildInvestorMetrics(summary = null) {
  const holdings = summary?.holdings || {};
  const totalValueChf = Number(holdings.totalValueChf);
  const investedChf = Number(holdings.investedChf);
  const cashChf = Number(holdings.cashChf);
  const dailyChangeChf = Number(holdings.dailyChangeChf);
  const sincePurchaseChf = Number.isFinite(totalValueChf) && Number.isFinite(investedChf)
    ? Number((totalValueChf - investedChf).toFixed(2))
    : null;
  const sincePurchasePct = sincePurchaseChf === null ? null : safePercent(sincePurchaseChf, investedChf);

  return {
    totalValueChf,
    investedChf,
    cashChf,
    dailyChangeChf,
    dailyChangePct: Number.isFinite(Number(holdings.dailyChangePct)) ? Number(holdings.dailyChangePct) : null,
    sincePurchaseChf,
    sincePurchasePct,
    holdingCount: Number(holdings.holdingCount || 0),
    latestSnapshotDate: holdings.latestSnapshotDate || null,
    lastSyncAt: holdings.lastSyncAt || null,
    baseCurrency: holdings.baseCurrency || 'CHF',
  };
}

function buildManagementSummary({ portfolioName, period, summary = null, topBlocker = null, nextAction = null, deliveryStatus = null }) {
  const metrics = buildInvestorMetrics(summary);
  const pending = parseQueueItems(deliveryStatus);
  const status = summary?.status || {};
  const clauses = [];

  if (Number.isFinite(metrics.totalValueChf)) {
    clauses.push(`${portfolioName} is worth ${formatCurrency(metrics.totalValueChf, 'CHF')}`);
  } else {
    clauses.push(`${portfolioName} has a fresh ${period} report ready`);
  }

  if (Number.isFinite(metrics.sincePurchaseChf)) {
    const performanceWord = metrics.sincePurchaseChf >= 0 ? 'up' : 'down';
    const pctPart = Number.isFinite(metrics.sincePurchasePct) ? ` (${formatPercent(metrics.sincePurchasePct)})` : '';
    clauses.push(`${performanceWord} ${formatSignedCurrency(metrics.sincePurchaseChf, 'CHF')} since purchase${pctPart}`);
  }

  if (status.health) clauses.push(`posture: ${String(status.health).replace(/_/g, ' ')}`);
  if (topBlocker) clauses.push(`main issue: ${topBlocker}`);
  else if (pending.length) clauses.push(`workflow still has ${pending.length} item(s) to close`);
  else clauses.push('no immediate blocker surfaced');
  clauses.push(`next: ${nextAction || 'continue monitoring'}`);
  return clauses.join('; ') + '.';
}

function buildHeadlineMetrics(summary = null) {
  const metrics = buildInvestorMetrics(summary);
  return [
    {
      label: 'Portfolio value',
      value: formatCurrency(metrics.totalValueChf, 'CHF'),
      detail: metrics.latestSnapshotDate ? `Snapshot ${metrics.latestSnapshotDate}` : null,
    },
    {
      label: 'Gain since purchase',
      value: metrics.sincePurchaseChf === null ? '—' : formatSignedCurrency(metrics.sincePurchaseChf, 'CHF'),
      detail: Number.isFinite(metrics.sincePurchasePct) ? formatPercent(metrics.sincePurchasePct) : 'Cost basis unavailable',
    },
    {
      label: 'Invested capital',
      value: formatCurrency(metrics.investedChf, 'CHF'),
      detail: metrics.lastSyncAt ? `Synced ${metrics.lastSyncAt}` : null,
    },
    {
      label: 'Cash balance',
      value: formatCurrency(metrics.cashChf, 'CHF'),
      detail: `${metrics.holdingCount || 0} holding(s)`,
    },
  ];
}

function buildStatusRows(summary = null, deliveryStatus = null, topBlocker = null, nextAction = null) {
  const status = summary?.status || {};
  const metrics = buildInvestorMetrics(summary);
  return [
    { label: 'Health', htmlValue: badge({ label: String(status.health || 'unknown').replace(/_/g, ' '), tone: parseStatusTone(status.health) }) },
    { label: 'Execution posture', htmlValue: badge({ label: String(status.executionPosture || 'unknown').replace(/_/g, ' '), tone: parseStatusTone(status.executionPosture) }) },
    { label: 'Broker', value: status.brokerMessage || status.brokerHealth || 'unknown' },
    { label: 'Top blocker', value: topBlocker || 'None' },
    { label: 'Next step', value: nextAction || 'Continue monitoring' },
    { label: 'Delivery', value: parseQueueItems(deliveryStatus).length ? `${parseQueueItems(deliveryStatus).length} item(s) pending` : 'Clear' },
    { label: 'Base currency', value: metrics.baseCurrency || 'CHF' },
  ];
}

function buildReportEmailText({ portfolioName, period, summaryMarkdown, summary = null, deliveryStatus = null, topBlocker = null, nextAction = null }) {
  const pending = parseQueueItems(deliveryStatus);
  const managementSummary = buildManagementSummary({ portfolioName, period, summary, topBlocker, nextAction, deliveryStatus });
  const metrics = buildInvestorMetrics(summary);

  return [
    `${portfolioName} ${period} investor overview`,
    '',
    'Management summary',
    managementSummary,
    '',
    'Headline metrics',
    `- Portfolio value (CHF): ${formatCurrency(metrics.totalValueChf, 'CHF')}`,
    `- Gain since purchase (CHF): ${metrics.sincePurchaseChf === null ? '—' : formatSignedCurrency(metrics.sincePurchaseChf, 'CHF')}`,
    `- Gain since purchase (%): ${Number.isFinite(metrics.sincePurchasePct) ? formatPercent(metrics.sincePurchasePct) : '—'}`,
    `- Invested capital (CHF): ${formatCurrency(metrics.investedChf, 'CHF')}`,
    `- Cash balance (CHF): ${formatCurrency(metrics.cashChf, 'CHF')}`,
    '',
    `Top blocker: ${topBlocker || 'none.'}`,
    `Next action: ${nextAction || 'continue monitoring.'}`,
    pending.length ? `Workflow items pending: ${pending.length}.` : 'Workflow items pending: none.',
    '',
    'Supporting detail',
    summaryMarkdown,
  ].join('\n');
}

function buildReportEmailHtml({ portfolioName, period, summaryHtml, summary = null, deliveryStatus = null, topBlocker = null, nextAction = null }) {
  const pending = parseQueueItems(deliveryStatus);
  const status = summary?.status || {};
  const managementSummary = buildManagementSummary({ portfolioName, period, summary, topBlocker, nextAction, deliveryStatus });
  const headlineMetrics = buildHeadlineMetrics(summary);

  const summaryCard = card({
    title: 'Management summary',
    tone: 'info',
    contentHtml: `
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">${badge({ label: String(status.health || 'unknown').replace(/_/g, ' '), tone: parseStatusTone(status.health) })}${badge({ label: String(status.executionPosture || 'unknown').replace(/_/g, ' '), tone: parseStatusTone(status.executionPosture) })}${badge({ label: pending.length ? `${pending.length} workflow item(s)` : 'Workflow clear', tone: pending.length ? 'warn' : 'success' })}</div>
      <div style="margin:0 0 14px;padding:14px 15px;background:#ffffff;border:1px solid #bfdbfe;border-radius:14px;">
        <div style="font-size:11px;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;margin-bottom:6px;">Investor take</div>
        <div style="font-size:16px;line-height:1.65;color:#0f172a;font-weight:700;">${escapeHtml(managementSummary)}</div>
      </div>
      ${metricGrid(headlineMetrics)}
    `,
  });

  const actionCard = card({
    title: 'Immediate priorities',
    tone: 'warn',
    contentHtml: `
      <div style="margin:0 0 10px;padding:14px 15px;background:#ffffff;border:1px solid #fdba74;border-radius:14px;">
        <div style="font-size:11px;color:#9a3412;text-transform:uppercase;letter-spacing:0.04em;font-weight:800;margin-bottom:6px;">Next action</div>
        <div style="font-size:16px;font-weight:800;color:#7c2d12;line-height:1.45;">${escapeHtml(nextAction || 'Continue monitoring')}</div>
      </div>
      <div style="padding:12px 14px;background:#fffaf5;border:1px solid #fed7aa;border-radius:14px;line-height:1.55;color:#7c2d12;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.04em;font-weight:800;margin-bottom:6px;">Main issue</div>
        <div style="font-size:14px;color:#431407;">${escapeHtml(topBlocker || 'No blocker surfaced.')}</div>
      </div>
    `,
  });

  const statusCard = card({
    title: 'Status snapshot',
    contentHtml: kvTable(buildStatusRows(summary, deliveryStatus, topBlocker, nextAction)),
  });

  const postureCard = card({
    title: 'Workflow items',
    contentHtml: pending.length
      ? bulletList(pending)
      : '<p style="margin:0;color:#475569;line-height:1.6;">Nothing else needs workflow cleanup right now.</p>',
  });

  const detailCard = card({
    title: 'Supporting detail',
    contentHtml: `<div class="report-email-summary" style="line-height:1.7;color:#0f172a;">${summaryHtml}</div>`,
  });

  return page({
    eyebrow: 'OpenClaw Portfolio Report',
    title: `${portfolioName} ${period} investor overview`,
    subtitle: 'Top line first: performance, next step, workflow status, then the full report detail.',
    accent: '#1e3a8a',
    bodyHtml: `${summaryCard}${actionCard}${statusCard}${postureCard}${detailCard}`,
    footer: 'OpenClaw Portfolio Manager • Policy-gated, auditable reporting',
  });
}

function loadSummaryEmailSource({ summaryPath = null, summaryHtmlPath = null }) {
  if (!summaryPath) throw new Error('summaryPath is required');
  const summaryMarkdown = fs.readFileSync(summaryPath, 'utf8');
  const resolvedHtmlPath = summaryHtmlPath || path.join(path.dirname(summaryPath), `${path.basename(summaryPath, path.extname(summaryPath))}.html`);
  const summaryHtml = fs.existsSync(resolvedHtmlPath)
    ? fs.readFileSync(resolvedHtmlPath, 'utf8')
    : `<pre>${escapeHtml(summaryMarkdown)}</pre>`;
  const summaryJsonPath = path.join(path.dirname(summaryPath), 'summary.json');
  const summary = fs.existsSync(summaryJsonPath)
    ? JSON.parse(fs.readFileSync(summaryJsonPath, 'utf8'))
    : null;
  return { summaryMarkdown, summaryHtml, summaryHtmlPath: resolvedHtmlPath, summary };
}

module.exports = {
  buildReportEmailSubject,
  buildReportEmailText,
  buildReportEmailHtml,
  loadSummaryEmailSource,
  buildInvestorMetrics,
  buildManagementSummary,
};
