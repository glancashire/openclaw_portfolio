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
    clauses.push(`${portfolioName} is currently worth ${formatCurrency(metrics.totalValueChf, 'CHF')}`);
  } else {
    clauses.push(`${portfolioName} has a fresh ${period} report available`);
  }

  if (Number.isFinite(metrics.sincePurchaseChf)) {
    const performanceWord = metrics.sincePurchaseChf >= 0 ? 'up' : 'down';
    const pctPart = Number.isFinite(metrics.sincePurchasePct) ? ` (${formatPercent(metrics.sincePurchasePct)})` : '';
    clauses.push(`${performanceWord} ${formatSignedCurrency(metrics.sincePurchaseChf, 'CHF')} since purchase${pctPart}`);
  }

  if (status.health) {
    clauses.push(`overall posture is ${String(status.health).replace(/_/g, ' ')}`);
  }

  if (topBlocker) {
    clauses.push(`the main issue is ${topBlocker}`);
  } else if (pending.length) {
    clauses.push(`the main follow-up is delivery and workflow cleanup (${pending.length} pending item(s))`);
  } else {
    clauses.push('no immediate blocker is surfaced');
  }

  clauses.push(`next step: ${nextAction || 'continue normal monitoring'}`);
  return clauses.join('; ') + '.';
}

function buildHeadlineMetrics(summary = null) {
  const metrics = buildInvestorMetrics(summary);
  return [
    {
      label: 'Portfolio value',
      value: formatCurrency(metrics.totalValueChf, 'CHF'),
      detail: metrics.latestSnapshotDate ? `Latest snapshot ${metrics.latestSnapshotDate}` : null,
    },
    {
      label: 'Gain since purchase',
      value: metrics.sincePurchaseChf === null ? '—' : formatSignedCurrency(metrics.sincePurchaseChf, 'CHF'),
      detail: Number.isFinite(metrics.sincePurchasePct) ? formatPercent(metrics.sincePurchasePct) : 'Cost basis unavailable',
    },
    {
      label: 'Invested capital',
      value: formatCurrency(metrics.investedChf, 'CHF'),
      detail: metrics.lastSyncAt ? `Last sync ${metrics.lastSyncAt}` : null,
    },
    {
      label: 'Cash balance',
      value: formatCurrency(metrics.cashChf, 'CHF'),
      detail: `Holdings ${metrics.holdingCount || 0}`,
    },
  ];
}

function buildStatusRows(summary = null, deliveryStatus = null, topBlocker = null, nextAction = null) {
  const status = summary?.status || {};
  const metrics = buildInvestorMetrics(summary);
  return [
    { label: 'Health', htmlValue: badge({ label: String(status.health || 'unknown').replace(/_/g, ' '), tone: parseStatusTone(status.health) }) },
    { label: 'Execution posture', htmlValue: badge({ label: String(status.executionPosture || 'unknown').replace(/_/g, ' '), tone: parseStatusTone(status.executionPosture) }) },
    { label: 'Broker health', value: status.brokerMessage || status.brokerHealth || 'unknown' },
    { label: 'Top blocker', value: topBlocker || 'No active blocker is currently surfaced.' },
    { label: 'Next action', value: nextAction || 'Continue normal monitoring.' },
    { label: 'Delivery posture', value: parseQueueItems(deliveryStatus).length ? `${parseQueueItems(deliveryStatus).length} pending item(s)` : 'Clear' },
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
    `Top blocker: ${topBlocker || 'none currently surfaced.'}`,
    `Next action: ${nextAction || 'continue normal monitoring.'}`,
    pending.length
      ? `Delivery posture still has ${pending.length} pending item(s).`
      : 'Delivery posture is clear of pending items.',
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
    contentHtml: `
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">${badge({ label: String(status.health || 'unknown').replace(/_/g, ' '), tone: parseStatusTone(status.health) })}${badge({ label: String(status.executionPosture || 'unknown').replace(/_/g, ' '), tone: parseStatusTone(status.executionPosture) })}${badge({ label: pending.length ? `${pending.length} pending item(s)` : 'Posture clear', tone: pending.length ? 'warn' : 'success' })}</div>
      <div style="margin:0 0 16px;padding:18px 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;">
        <div style="font-size:12px;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:8px;">Investor take</div>
        <div style="font-size:17px;line-height:1.7;color:#0f172a;font-weight:600;">${escapeHtml(managementSummary)}</div>
      </div>
      ${metricGrid(headlineMetrics)}
    `,
  });

  const actionCard = card({
    title: 'Immediate priorities',
    contentHtml: `
      <div style="margin:0 0 12px;padding:16px 18px;background:#fff7ed;border:1px solid #fdba74;border-radius:12px;">
        <div style="font-size:12px;color:#9a3412;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;margin-bottom:6px;">Next action</div>
        <div style="font-size:16px;font-weight:700;color:#7c2d12;line-height:1.5;">${escapeHtml(nextAction || 'Continue normal monitoring.')}</div>
      </div>
      <div style="margin:0;padding:16px 18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;line-height:1.6;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;margin-bottom:6px;">Main issue</div>
        <div style="font-size:15px;color:#111827;">${escapeHtml(topBlocker || 'No active blocker is currently surfaced.')}</div>
      </div>
    `,
  });

  const statusCard = card({
    title: 'Portfolio status',
    contentHtml: kvTable(buildStatusRows(summary, deliveryStatus, topBlocker, nextAction)),
  });

  const postureCard = card({
    title: 'Pending workflow items',
    contentHtml: pending.length
      ? bulletList(pending)
      : '<p style="margin:0;color:#6b7280;line-height:1.6;">No delivery-side or workflow-side pending items are currently surfaced.</p>',
  });

  const detailCard = card({
    title: 'Supporting detail',
    contentHtml: `<div class="report-email-summary" style="line-height:1.7;color:#111827;">${summaryHtml}</div>`,
  });

  return page({
    eyebrow: 'OpenClaw Portfolio Report',
    title: `${portfolioName} ${period} investor overview`,
    subtitle: 'Management summary first, then CHF performance, immediate priorities, and supporting operating detail.',
    accent: '#0f172a',
    bodyHtml: `${summaryCard}${actionCard}${statusCard}${postureCard}${detailCard}`,
    footer: 'OpenClaw Portfolio Manager • Investor-style reporting remains policy-gated and auditable',
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
