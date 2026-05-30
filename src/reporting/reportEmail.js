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
  dataTable,
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
  const profitLossTotals = summary?.profitLoss?.totals || {};
  const totalValueChf = Number(holdings.totalValueChf);
  const investedChf = Number(holdings.investedChf);
  const cashChf = Number(holdings.cashChf);
  const dailyChangeChf = Number(holdings.dailyChangeChf);
  const coveredCostBasisChf = Number(profitLossTotals.totalCostBasisChf);
  const coveredProfitChf = Number(profitLossTotals.totalProfitChf);
  const holdingCount = Number(holdings.holdingCount || 0);
  const coveredHoldingCount = Number(profitLossTotals.coveredCount || 0);
  const sincePurchaseChf = Number.isFinite(coveredProfitChf)
    ? coveredProfitChf
    : null;
  const sincePurchasePct = Number.isFinite(coveredProfitChf) && Number.isFinite(coveredCostBasisChf) && coveredCostBasisChf > 0
    ? safePercent(coveredProfitChf, coveredCostBasisChf)
    : null;
  const sincePurchaseAvailability = sincePurchaseChf === null
    ? 'missing'
    : coveredHoldingCount === holdingCount
      ? 'complete'
      : 'partial';

  return {
    totalValueChf,
    investedChf,
    cashChf,
    dailyChangeChf,
    dailyChangePct: Number.isFinite(Number(holdings.dailyChangePct)) ? Number(holdings.dailyChangePct) : null,
    sincePurchaseChf,
    sincePurchasePct,
    sincePurchaseAvailability,
    holdingCount,
    coveredHoldingCount,
    coveredCostBasisChf: Number.isFinite(coveredCostBasisChf) ? coveredCostBasisChf : null,
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
    const coveragePart = metrics.sincePurchaseAvailability === 'partial'
      ? ` based on ${metrics.coveredHoldingCount}/${metrics.holdingCount} holdings with cost basis`
      : '';
    clauses.push(`${performanceWord} ${formatSignedCurrency(metrics.sincePurchaseChf, 'CHF')} since purchase${pctPart}${coveragePart}`);
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
      detail: Number.isFinite(metrics.sincePurchasePct)
        ? `${formatPercent(metrics.sincePurchasePct)}${metrics.sincePurchaseAvailability === 'partial' ? ` • ${metrics.coveredHoldingCount}/${metrics.holdingCount} covered` : ''}`
        : 'Cost basis unavailable',
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

function availabilityText(value, fallback = 'Unavailable') {
  return value == null || value === '' ? fallback : value;
}

function buildInvestorHoldingsTable(summary = null) {
  const investorHoldings = Array.isArray(summary?.investorHoldings?.rows) ? summary.investorHoldings.rows : [];
  const totals = summary?.investorHoldings?.totals || {};
  if (!investorHoldings.length) {
    return '<div style="padding:14px 15px;background:#ffffff;border:1px solid #dbe4f0;border-radius:14px;color:#475569;line-height:1.6;">Held instruments data is not available in this sample yet.</div>';
  }
  const table = dataTable({
    columns: [
      { label: 'Symbol' },
      { label: 'Name' },
      { label: 'Quantity', align: 'right' },
      { label: 'Average buy price', align: 'right' },
      { label: 'Latest price', align: 'right' },
      { label: 'Total value', align: 'right' },
      { label: 'Gain since purchase', align: 'right' },
      { label: 'YTD', align: 'right' },
      { label: 'Value in CHF', align: 'right' },
      { label: 'Gains in CHF', align: 'right' },
    ],
    rows: investorHoldings.map((row) => ([
      escapeHtml(row.symbol || '—'),
      escapeHtml(row.name || '—'),
      escapeHtml(Number.isFinite(Number(row.quantityHeld)) ? String(row.quantityHeld) : '—'),
      escapeHtml(row.averageBuyPrice == null ? 'Cost basis unavailable' : formatCurrency(row.averageBuyPrice, row.currency || 'CHF')),
      escapeHtml(row.lastTradedPrice == null ? '—' : formatCurrency(row.lastTradedPrice, row.currency || 'CHF')),
      escapeHtml(row.totalValue == null ? '—' : formatCurrency(row.totalValue, row.currency || 'CHF')),
      escapeHtml(row.gainSincePurchasePct == null ? 'Cost basis unavailable' : formatPercent(row.gainSincePurchasePct)),
      escapeHtml(row.ytdPct == null ? 'YTD unavailable' : formatPercent(row.ytdPct)),
      escapeHtml(row.valueChf == null ? '—' : formatCurrency(row.valueChf, 'CHF')),
      escapeHtml(row.gainSincePurchaseChf == null ? 'Cost basis unavailable' : formatCurrency(row.gainSincePurchaseChf, 'CHF')),
    ])),
  });

  const summaryLine = `<div style="margin-top:12px;padding:12px 14px;background:#ffffff;border:1px solid #dbe4f0;border-radius:14px;color:#0f172a;line-height:1.6;"><strong>Total held instruments:</strong> ${escapeHtml(String(totals.rowCount || 0))} &nbsp;•&nbsp; <strong>Total value in CHF:</strong> ${escapeHtml(formatCurrency(totals.totalValueChf, 'CHF'))} &nbsp;•&nbsp; <strong>Total gains in CHF:</strong> ${escapeHtml(totals.totalGainChf == null ? 'Cost basis unavailable' : formatCurrency(totals.totalGainChf, 'CHF'))}</div>`;
  return `${table}${summaryLine}`;
}

function buildInvestorHoldingsText(summary = null) {
  const investorHoldings = Array.isArray(summary?.investorHoldings?.rows) ? summary.investorHoldings.rows : [];
  const totals = summary?.investorHoldings?.totals || {};
  const lines = ['Held instruments'];
  if (!investorHoldings.length) {
    lines.push('Held instruments data is not available in this sample yet.');
    return lines.join('\n');
  }
  for (const row of investorHoldings) {
    lines.push(`- ${availabilityText(row.symbol, '—')} — ${availabilityText(row.name, 'Unnamed instrument')}`);
    lines.push(`  Quantity: ${row.quantityHeld == null ? '—' : row.quantityHeld}`);
    lines.push(`  Average buy price: ${row.averageBuyPrice == null ? 'unavailable' : formatCurrency(row.averageBuyPrice, row.currency || 'CHF')}`);
    lines.push(`  Latest price: ${row.lastTradedPrice == null ? '—' : formatCurrency(row.lastTradedPrice, row.currency || 'CHF')}`);
    lines.push(`  Total value: ${row.totalValue == null ? '—' : formatCurrency(row.totalValue, row.currency || 'CHF')}`);
    lines.push(`  Gain since purchase: ${row.gainSincePurchasePct == null ? 'unavailable' : formatPercent(row.gainSincePurchasePct)}`);
    lines.push(`  YTD: ${row.ytdPct == null ? 'unavailable' : formatPercent(row.ytdPct)}`);
    lines.push(`  Value in CHF: ${row.valueChf == null ? '—' : formatCurrency(row.valueChf, 'CHF')}`);
    lines.push(`  Gains in CHF: ${row.gainSincePurchaseChf == null ? 'unavailable' : formatCurrency(row.gainSincePurchaseChf, 'CHF')}`);
  }
  lines.push(`Total held instruments: ${totals.rowCount || 0}`);
  lines.push(`Total value in CHF: ${formatCurrency(totals.totalValueChf, 'CHF')}`);
  lines.push(`Total gains in CHF: ${totals.totalGainChf == null ? 'unavailable' : formatCurrency(totals.totalGainChf, 'CHF')}`);
  return lines.join('\n');
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
    `- Gain coverage: ${metrics.sincePurchaseAvailability === 'missing' ? 'cost basis unavailable' : metrics.sincePurchaseAvailability === 'partial' ? `${metrics.coveredHoldingCount}/${metrics.holdingCount} holdings with cost basis` : 'all holdings covered'}`,
    `- Invested capital (CHF): ${formatCurrency(metrics.investedChf, 'CHF')}`,
    `- Cash balance (CHF): ${formatCurrency(metrics.cashChf, 'CHF')}`,
    '',
    buildInvestorHoldingsText(summary),
    '',
    'Next step to improve the portfolio',
    `${nextAction || 'Continue monitoring.'}`,
    `What matters now: ${nextAction || 'Continue monitoring.'}`,
    `Next action: ${nextAction || 'Continue monitoring.'}`,
    '',
    `Top blocker: ${topBlocker || 'none.'}`,
    pending.length ? `Workflow items pending: ${pending.length}.` : 'Workflow items pending: none.',
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
        <div style="font-size:11px;color:#9a3412;text-transform:uppercase;letter-spacing:0.04em;font-weight:800;margin-bottom:6px;">What matters now</div>
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

  const holdingsCard = card({
    title: 'Held instruments',
    contentHtml: buildInvestorHoldingsTable(summary),
  });

  const improvementCard = card({
    title: 'Next step to improve the portfolio',
    tone: 'success',
    contentHtml: `<div style="padding:12px 14px;background:#ffffff;border:1px solid #bbf7d0;border-radius:14px;font-size:15px;line-height:1.6;color:#14532d;font-weight:700;"><div style="font-size:11px;color:#166534;text-transform:uppercase;letter-spacing:0.04em;font-weight:800;margin-bottom:6px;">What matters now</div>${escapeHtml(nextAction || 'Continue monitoring')}</div>`,
  });

  return page({
    eyebrow: 'OpenClaw Portfolio Report',
    title: `${portfolioName} ${period} investor overview`,
    subtitle: 'Top line first: performance, next step, workflow status, then the full report detail.',
    accent: '#1e3a8a',
    bodyHtml: `${summaryCard}${holdingsCard}${improvementCard}${actionCard}${statusCard}${postureCard}`,
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
  const siblingJsonPath = path.join(path.dirname(summaryPath), `${path.basename(summaryPath, path.extname(summaryPath))}.json`);
  const fallbackJsonPath = path.join(path.dirname(summaryPath), 'summary.json');
  const summaryJsonPath = fs.existsSync(siblingJsonPath) ? siblingJsonPath : fallbackJsonPath;
  const summary = fs.existsSync(summaryJsonPath)
    ? JSON.parse(fs.readFileSync(summaryJsonPath, 'utf8'))
    : null;
  return { summaryMarkdown, summaryHtml, summaryHtmlPath: resolvedHtmlPath, summary, summaryJsonPath };
}

module.exports = {
  buildReportEmailSubject,
  buildReportEmailText,
  buildReportEmailHtml,
  loadSummaryEmailSource,
  buildInvestorMetrics,
  buildManagementSummary,
};
