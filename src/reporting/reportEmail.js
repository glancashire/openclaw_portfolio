const fs = require('fs');
const path = require('path');
const {
  escapeHtml,
  page,
  card,
  badge,
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
  if (numeric === 0) return formatCurrency(0, currency);
  return `${numeric > 0 ? '+' : '-'}${formatCurrency(Math.abs(numeric), currency)}`;
}

function safePercent(value, base) {
  const numericValue = Number(value);
  const numericBase = Number(base);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericBase) || numericBase === 0) return null;
  return Number(((numericValue / numericBase) * 100).toFixed(1));
}

const AI_THEME_SYMBOLS = new Set(['SEC0', 'AIFS', 'AINF', 'XAIX']);
const LOW_CASH_BUFFER_PCT = 3;
const DEPLOYABLE_CASH_PCT = 4;

function investorHoldingRows(summary = null) {
  const rows = Array.isArray(summary?.investorHoldings?.rows) ? summary.investorHoldings.rows.slice() : [];
  return rows.sort((a, b) => {
    const valueDiff = Number(b.valueChf || 0) - Number(a.valueChf || 0);
    if (valueDiff !== 0) return valueDiff;
    return String(a.symbol || a.name || '').localeCompare(String(b.symbol || b.name || ''));
  });
}

function isAiThemeRow(row = {}) {
  return AI_THEME_SYMBOLS.has(String(row.symbol || '').toUpperCase());
}

function buildRecommendationContext(summary = null) {
  const metrics = buildInvestorMetrics(summary);
  const rows = investorHoldingRows(summary);
  const totalValueChf = Number(metrics.totalValueChf || 0);
  const cashPct = totalValueChf > 0
    ? Number(((Number(metrics.cashChf || 0) / totalValueChf) * 100).toFixed(1))
    : 0;
  const aiAllocationPct = Number(rows.reduce((sum, row) => {
    if (!isAiThemeRow(row) || !Number.isFinite(Number(row.allocationPct))) return sum;
    return sum + Number(row.allocationPct);
  }, 0).toFixed(1));
  const largestHolding = rows.find((row) => Number.isFinite(Number(row.allocationPct))) || null;
  const biggestUnderweight = rows
    .filter((row) => Number.isFinite(Number(row.driftPct)) && Number(row.driftPct) <= -1.5)
    .sort((a, b) => Number(a.driftPct) - Number(b.driftPct) || Number(b.valueChf || 0) - Number(a.valueChf || 0))[0] || null;
  const biggestOverweight = rows
    .filter((row) => Number.isFinite(Number(row.driftPct)) && Number(row.driftPct) >= 1.5)
    .sort((a, b) => Number(b.driftPct) - Number(a.driftPct) || Number(b.valueChf || 0) - Number(a.valueChf || 0))[0] || null;

  return {
    metrics,
    rows,
    cashPct,
    aiAllocationPct,
    largestHolding,
    biggestUnderweight,
    biggestOverweight,
    cashConstrained: cashPct < LOW_CASH_BUFFER_PCT,
    deployableCash: cashPct >= DEPLOYABLE_CASH_PCT,
  };
}

function holdingCostBasisChf(row = {}) {
  if (row.costBasisChf != null && Number.isFinite(Number(row.costBasisChf))) return Number(row.costBasisChf);
  if (row.averageBuyPrice == null || row.quantityHeld == null) return null;
  if (!Number.isFinite(Number(row.averageBuyPrice)) || !Number.isFinite(Number(row.quantityHeld))) return null;
  return Number((Number(row.averageBuyPrice) * Number(row.quantityHeld)).toFixed(2));
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

function investorStatusLabel(summary = null, deliveryStatus = null, topBlocker = null) {
  const status = summary?.status || {};
  if (topBlocker) return 'Attention needed';
  if (parseQueueItems(deliveryStatus).length > 0) return 'Attention needed';
  if (status.health === 'healthy' || status.health === 'on_track') return 'On track';
  if (status.health === 'rebalance_needed' || status.strategy === 'rebalance_needed') return 'Rebalance watch';
  if (status.health === 'attention_needed' || status.health === 'warning') return 'Rebalance watch';
  if (status.health === 'blocked' || status.health === 'paused') return 'Defensive posture';
  return 'Rebalance watch';
}

function investorStatusTone(label = '') {
  const normalized = String(label || '').toLowerCase();
  if (normalized === 'on track') return 'success';
  if (normalized === 'rebalance watch') return 'warn';
  if (normalized === 'attention needed' || normalized === 'defensive posture') return 'danger';
  return 'info';
}

function buildCoreRecommendation(summary = null, deliveryStatus = null, topBlocker = null, nextAction = null) {
  if (topBlocker || parseQueueItems(deliveryStatus).length > 0) {
    return nextAction || summary?.recommendedNextStep || 'Review the current portfolio status.';
  }

  const context = buildRecommendationContext(summary);
  const preferredAdd = context.biggestUnderweight && !isAiThemeRow(context.biggestUnderweight)
    ? context.biggestUnderweight
    : context.biggestUnderweight;

  if (context.cashConstrained) {
    if (context.aiAllocationPct >= 18 || Number(context.largestHolding?.allocationPct || 0) >= 22) {
      return 'Hold current positions; rebuild cash before adding to the most concentrated sleeves.';
    }
    return 'Hold current positions; rebuild cash before adding more equity risk.';
  }

  if (context.biggestOverweight && Number(context.biggestOverweight.driftPct || 0) >= 2.5 && Number(context.biggestOverweight.allocationPct || 0) >= 12) {
    return `Avoid adding to ${context.biggestOverweight.symbol || 'the most overweight sleeve'} until its weight moves closer to target.`;
  }

  if (preferredAdd && Number(preferredAdd.driftPct || 0) <= -2.0) {
    return `Add gradually to ${preferredAdd.symbol || 'the most underweight sleeve'} with fresh cash while leaving the rest unchanged.`;
  }

  return nextAction || summary?.recommendedNextStep || 'Hold current positions and continue monitoring.';
}

function buildHeaderSummary(summary = null, deliveryStatus = null, topBlocker = null, nextAction = null) {
  const metrics = buildInvestorMetrics(summary);
  const statusLabel = investorStatusLabel(summary, deliveryStatus, topBlocker);
  return {
    currentValue: formatCurrency(metrics.totalValueChf, 'CHF'),
    investedMoney: formatCurrency(metrics.investedChf, 'CHF'),
    remainingCash: formatCurrency(metrics.cashChf, 'CHF'),
    statusLabel,
    statusTone: investorStatusTone(statusLabel),
    snapshotLabel: metrics.latestSnapshotDate ? `Snapshot ${metrics.latestSnapshotDate}` : (metrics.lastSyncAt ? `Synced ${metrics.lastSyncAt}` : null),
    coreRecommendation: buildCoreRecommendation(summary, deliveryStatus, topBlocker, nextAction),
  };
}

function availabilityText(value, fallback = 'Unavailable') {
  return value == null || value === '' ? fallback : value;
}

function holdingRecommendation(row = {}, summary = null, context = buildRecommendationContext(summary)) {
  const holdingPct = Number(row.allocationPct);
  const targetPct = Number(row.targetPct);
  const driftPct = Number(row.driftPct);
  const gainPct = Number(row.gainSincePurchasePct);

  if (!Number.isFinite(holdingPct) || !Number.isFinite(targetPct) || !Number.isFinite(driftPct)) return 'HOLD';

  const materiallyOverweight = driftPct >= 3.0 || (holdingPct >= 20 && driftPct >= 1.5);
  if (materiallyOverweight && (holdingPct >= 20 || targetPct >= 12) && (gainPct >= -1.0 || !Number.isFinite(gainPct))) {
    return 'SELL';
  }

  // Suppress BUY when the cash buffer is already thin or AI exposure is already crowded.
  if (context.cashConstrained) return 'HOLD';
  if (isAiThemeRow(row) && context.aiAllocationPct >= 18 && driftPct > -2.5) return 'HOLD';

  const materiallyUnderweight = driftPct <= -2.0 || holdingPct <= targetPct - 2.0;
  if (context.deployableCash && materiallyUnderweight && row.symbol === context.biggestUnderweight?.symbol) {
    return 'BUY';
  }

  return 'HOLD';
}

function recommendationTone(label = '') {
  if (label === 'BUY') return 'success';
  if (label === 'SELL') return 'danger';
  return 'neutral';
}

function buildInvestorHoldingsTable(summary = null) {
  const context = buildRecommendationContext(summary);
  const investorHoldings = context.rows;
  const totals = summary?.investorHoldings?.totals || {};
  if (!investorHoldings.length) {
    return '<div style="padding:14px 15px;background:#ffffff;border:1px solid #dbe4f0;border-radius:14px;color:#475569;line-height:1.6;">Holdings data is not available yet.</div>';
  }

  const headerCells = [
    { label: 'Instrument', align: 'left' },
    { label: 'Value CHF', align: 'right' },
    { label: 'Avg. cost CHF', align: 'right' },
    { label: 'Gain CHF', align: 'right' },
    { label: 'Gain %', align: 'right' },
    { label: 'Holding %', align: 'right' },
    { label: 'Recommendation', align: 'right' },
  ];

  const bodyRows = investorHoldings.map((row) => {
    const recommendation = holdingRecommendation(row, summary, context);
    const costBasisChf = holdingCostBasisChf(row);
    const gainChf = Number(row.gainSincePurchaseChf);
    const gainPct = Number(row.gainSincePurchasePct);
    const gainColor = gainChf > 0 || gainPct > 0 ? '#166534' : gainChf < 0 || gainPct < 0 ? '#991b1b' : '#334155';
    return `<tr>
      <td style="padding:12px 12px 12px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;min-width:220px;">
        <div style="font-size:13px;font-weight:800;color:#0f172a;">${escapeHtml(row.symbol || row.name || '—')}</div>
        <div style="margin-top:3px;font-size:12px;line-height:1.45;color:#64748b;">${escapeHtml(row.name || '')}</div>
      </td>
      <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;font-size:13px;font-weight:800;color:#0f172a;white-space:nowrap;">${escapeHtml(row.valueChf == null ? '—' : formatCurrency(row.valueChf, 'CHF'))}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;font-size:13px;color:#475569;white-space:nowrap;">${escapeHtml(costBasisChf == null ? '—' : formatCurrency(costBasisChf, 'CHF'))}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;font-size:13px;font-weight:700;color:${gainColor};white-space:nowrap;">${escapeHtml(row.gainSincePurchaseChf == null ? '—' : formatSignedCurrency(row.gainSincePurchaseChf, 'CHF'))}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;font-size:13px;font-weight:700;color:${gainColor};white-space:nowrap;">${escapeHtml(row.gainSincePurchasePct == null ? '—' : formatPercent(row.gainSincePurchasePct))}</td>
      <td style="padding:12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;font-size:13px;color:#0f172a;white-space:nowrap;">${escapeHtml(row.allocationPct == null ? '—' : `${Number(row.allocationPct).toFixed(1)}%`)}</td>
      <td style="padding:12px 0 12px 10px;border-bottom:1px solid #e2e8f0;text-align:right;vertical-align:top;white-space:nowrap;">${badge({ label: recommendation, tone: recommendationTone(recommendation) })}</td>
    </tr>`;
  }).join('');

  const headerRow = `<tr>${headerCells.map((column, index) => `<th style="padding:0 ${index === 0 ? '12px 8px 12px 0' : index === headerCells.length - 1 ? '12px 0 12px 10px' : '12px 10px'};text-align:${column.align};border-bottom:1px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;line-height:1.3;font-weight:800;white-space:nowrap;">${escapeHtml(column.label)}</th>`).join('')}</tr>`;
  const table = `<div style="overflow-x:auto;"><table style="width:100%;min-width:680px;border-collapse:collapse;background:#ffffff;">${headerRow}${bodyRows}</table></div>`;
  const summaryLine = `<div style="margin-top:10px;font-size:12px;line-height:1.6;color:#475569;"><strong>Holdings:</strong> ${escapeHtml(String(totals.rowCount || 0))} &nbsp;•&nbsp; <strong>Holdings value:</strong> ${escapeHtml(formatCurrency(totals.totalValueChf, 'CHF'))} &nbsp;•&nbsp; <strong>Total gain:</strong> ${escapeHtml(totals.totalGainChf == null ? '—' : formatSignedCurrency(totals.totalGainChf, 'CHF'))}</div>`;
  return `${table}${summaryLine}`;
}

function buildInvestorHoldingsText(summary = null) {
  const context = buildRecommendationContext(summary);
  const investorHoldings = context.rows;
  const totals = summary?.investorHoldings?.totals || {};
  const lines = ['Holdings'];
  if (!investorHoldings.length) {
    lines.push('Holdings data is not available yet.');
    return lines.join('\n');
  }
  for (const row of investorHoldings) {
    const recommendation = holdingRecommendation(row, summary, context);
    const costBasisChf = holdingCostBasisChf(row);
    lines.push(`${availabilityText(row.symbol, '—')} — ${availabilityText(row.name, 'Unnamed instrument')}`);
    lines.push(`  Value CHF: ${row.valueChf == null ? '—' : formatCurrency(row.valueChf, 'CHF')}`);
    lines.push(`  Avg. cost CHF: ${costBasisChf == null ? '—' : formatCurrency(costBasisChf, 'CHF')}`);
    lines.push(`  Gain CHF: ${row.gainSincePurchaseChf == null ? '—' : formatSignedCurrency(row.gainSincePurchaseChf, 'CHF')}`);
    lines.push(`  Gain %: ${row.gainSincePurchasePct == null ? '—' : formatPercent(row.gainSincePurchasePct)}`);
    lines.push(`  Holding %: ${row.allocationPct == null ? '—' : `${Number(row.allocationPct).toFixed(1)}%`}`);
    lines.push(`  Recommendation: ${recommendation}`);
  }
  lines.push(`Holdings count: ${totals.rowCount || 0}`);
  lines.push(`Holdings value: ${formatCurrency(totals.totalValueChf, 'CHF')}`);
  lines.push(`Total gain: ${totals.totalGainChf == null ? '—' : formatSignedCurrency(totals.totalGainChf, 'CHF')}`);
  return lines.join('\n');
}

function buildFooterAnalysis(summary = null, nextAction = null) {
  const context = buildRecommendationContext(summary);
  const preferredAdd = context.biggestUnderweight && !isAiThemeRow(context.biggestUnderweight)
    ? context.biggestUnderweight
    : context.biggestUnderweight;
  const largestSymbol = availabilityText(context.largestHolding?.symbol, 'The largest sleeve');

  const improve = context.cashConstrained
    ? 'Cash is below the preferred buffer; rebuild dry powder before adding more equity risk.'
    : preferredAdd
      ? `Fresh cash should first go to ${preferredAdd.symbol} or another underweight core sleeve.`
      : 'The portfolio is broadly invested; future additions should stay selective and disciplined.';
  const risks = context.aiAllocationPct >= 18 && context.largestHolding
    ? `${largestSymbol} remains the largest sleeve, and the AI cluster adds extra cyclical risk.`
    : context.largestHolding && Number(context.largestHolding.allocationPct || 0) >= 20
      ? `${largestSymbol} is the biggest single sleeve, so pullbacks there will move total returns.`
      : 'The main risk is concentration in the largest core equity sleeves.';
  const opportunities = context.cashConstrained
    ? preferredAdd
      ? `The next contribution can rebuild cash and top up ${preferredAdd.symbol} without increasing concentration.`
      : 'The next contribution can rebuild cash and improve diversification.'
    : preferredAdd
      ? `Fresh cash can be directed to ${preferredAdd.symbol} before adding to crowded positions.`
      : nextAction && /divers/i.test(String(nextAction))
        ? 'Future contributions can improve diversification while keeping the portfolio balanced.'
        : 'Future contributions can be used to diversify outside the strongest existing concentrations.';
  return { improve, risks, opportunities };
}

function buildReportEmailText({ portfolioName, period, summaryMarkdown, summary = null, deliveryStatus = null, topBlocker = null, nextAction = null }) {
  const header = buildHeaderSummary(summary, deliveryStatus, topBlocker, nextAction);
  const footer = buildFooterAnalysis(summary, nextAction);
  return [
    `${portfolioName} ${period} investor overview`,
    '',
    `Current value: ${header.currentValue}`,
    `Invested money: ${header.investedMoney}`,
    `Remaining cash: ${header.remainingCash}`,
    `Status: ${header.statusLabel}`,
    `Core recommendation: ${header.coreRecommendation}`,
    header.snapshotLabel ? `Snapshot: ${header.snapshotLabel}` : null,
    '',
    buildInvestorHoldingsText(summary),
    '',
    'Improve',
    `${footer.improve}`,
    'Risks',
    `${footer.risks}`,
    'Opportunities',
    `${footer.opportunities}`,
  ].filter(Boolean).join('\n');
}

function buildReportEmailHtml({ portfolioName, period, summaryHtml, summary = null, deliveryStatus = null, topBlocker = null, nextAction = null }) {
  const header = buildHeaderSummary(summary, deliveryStatus, topBlocker, nextAction);
  const footer = buildFooterAnalysis(summary, nextAction);

  const summaryCard = card({
    tone: 'surface',
    contentHtml: `
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;margin-bottom:8px;">${escapeHtml(portfolioName)} portfolio</div>
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:4px;">Current value</div>
      <div style="font-size:34px;line-height:1.1;color:#0f172a;font-weight:800;margin-bottom:10px;">${escapeHtml(header.currentValue)}</div>
      <div style="font-size:0;margin-bottom:10px;">
        <div style="display:inline-block;vertical-align:top;width:50%;min-width:220px;box-sizing:border-box;padding-right:8px;">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Invested money</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(header.investedMoney)}</div>
        </div>
        <div style="display:inline-block;vertical-align:top;width:50%;min-width:220px;box-sizing:border-box;padding-left:8px;">
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">Remaining cash</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;">${escapeHtml(header.remainingCash)}</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">${badge({ label: header.statusLabel, tone: header.statusTone })}${header.snapshotLabel ? `<span style="font-size:12px;color:#64748b;">${escapeHtml(header.snapshotLabel)}</span>` : ''}</div>
    `,
  });

  const recommendationCard = card({
    tone: 'info',
    contentHtml: `
      <div style="font-size:11px;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;margin-bottom:6px;">Core recommendation</div>
      <div style="font-size:17px;line-height:1.55;color:#0f172a;font-weight:700;">${escapeHtml(header.coreRecommendation)}</div>
    `,
  });

  const holdingsCard = card({
    title: 'Holdings',
    contentHtml: buildInvestorHoldingsTable(summary),
  });

  const analysisCard = card({
    title: 'Overall analysis',
    tone: 'surface',
    contentHtml: `
      <div style="font-size:14px;line-height:1.7;color:#0f172a;">
        <div style="margin-bottom:8px;"><strong>Improve:</strong> ${escapeHtml(footer.improve)}</div>
        <div style="margin-bottom:8px;"><strong>Risks:</strong> ${escapeHtml(footer.risks)}</div>
        <div><strong>Opportunities:</strong> ${escapeHtml(footer.opportunities)}</div>
      </div>
    `,
  });

  return page({
    eyebrow: 'OpenClaw Portfolio Report',
    title: `${portfolioName} ${period} investor overview`,
    subtitle: 'Minimal portfolio snapshot with the key numbers, recommendations, and risks first.',
    accent: '#1e3a8a',
    bodyHtml: `${summaryCard}${recommendationCard}${holdingsCard}${analysisCard}`,
    footer: 'OpenClaw Portfolio Manager • Investor email summary',
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
  buildCoreRecommendation,
  buildHeaderSummary,
  buildFooterAnalysis,
};
