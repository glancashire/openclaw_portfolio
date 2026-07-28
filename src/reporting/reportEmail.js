const fs = require('fs');
const path = require('path');
const { loadDepositsLedger } = require('../../lib/depositsLedger');
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
    performanceWindows: summary?.performance?.portfolio?.windows || null,
  };
}

function formatWindowValue(window = {}, kind = 'currency') {
  if (!window || window.availability !== 'available' && window.availability !== 'partial' && window.availability !== 'complete') return '—';
  if (kind === 'percent') return window.gainPct == null ? '—' : formatPercent(window.gainPct);
  return window.gainChf == null ? '—' : formatSignedCurrency(window.gainChf, 'CHF');
}

function renderWindowAvailability(window = {}) {
  if (!window) return '—';
  if (window.availability === 'partial') return 'partial';
  if (window.availability === 'portfolio_level_only') return 'portfolio only';
  if (window.availability === 'missing_history') return 'unavailable';
  if (window.availability === 'missing') return '—';
  return window.anchorDate ? `anchor ${window.anchorDate}` : 'available';
}

function portfolioWindowEntries(summary = null) {
  const windows = summary?.performance?.portfolio?.windows || {};
  return [
    ['Since purchase', windows.sincePurchase],
    ['Last 7 days', windows.last7d],
    ['Last 30 days', windows.last30d],
    ['YTD', windows.ytd],
    ['Last 365 days', windows.last365d],
  ];
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

function buildReportEmailText({ portfolioName, period, summaryMarkdown, summary = null, deliveryStatus = null, topBlocker = null, nextAction = null, portfolioDir = null }) {
  const metrics = buildInvestorMetrics(summary);
  const profitLoss = summary?.profitLoss?.totals || {};
  const rows = investorHoldingRows(summary);
  const investedChf = Number.isFinite(metrics.investedChf) ? metrics.investedChf : null;

  let netDepositedChf = null;
  let cumulativeDepositsChf = null;
  let cumulativeWithdrawalsChf = null;
  if (portfolioDir) {
    try {
      const dl = loadDepositsLedger(portfolioDir);
      if (dl && !dl.missing) {
        netDepositedChf = Number(dl.totals.netDepositedChf);
        cumulativeDepositsChf = Number(dl.totals.cumulativeDepositsChf);
        cumulativeWithdrawalsChf = Number(dl.totals.cumulativeWithdrawalsChf);
      }
    } catch (_err) { /* ignore */ }
  }
  const hasNetDeposits = Number.isFinite(netDepositedChf) && netDepositedChf > 0;
  const hasWithdrawals = Number.isFinite(cumulativeWithdrawalsChf) && cumulativeWithdrawalsChf > 0;
  const totalReturnChf = hasNetDeposits && Number.isFinite(metrics.totalValueChf)
    ? Number((metrics.totalValueChf - netDepositedChf).toFixed(2))
    : null;
  const totalReturnPct = hasNetDeposits && totalReturnChf != null
    ? Number(((totalReturnChf / netDepositedChf) * 100).toFixed(2))
    : null;

  const lines = [
    `${portfolioName} ${period} portfolio snapshot`,
    '',
    'Portfolio Value',
    `Total value: ${formatCurrency(metrics.totalValueChf, 'CHF')}`,
    `Cash: ${formatCurrency(metrics.cashChf, 'CHF')}`,
    ...(hasNetDeposits
      ? hasWithdrawals
        ? [
            `Net deposited: ${formatCurrency(netDepositedChf, 'CHF')}`,
            `(Deposits ${formatCurrency(cumulativeDepositsChf, 'CHF')}, Withdrawals ${formatCurrency(cumulativeWithdrawalsChf, 'CHF')})`,
          ]
        : [`Net deposited: ${formatCurrency(netDepositedChf, 'CHF')}`]
      : [`Invested: ${formatCurrency(metrics.investedChf, 'CHF')}`]),
    '',
    'Profit / Loss',
    ...(hasNetDeposits
      ? [
          `Total return vs deposits: ${totalReturnChf >= 0 ? '+' : ''}${formatCurrency(totalReturnChf, 'CHF')}${totalReturnPct != null ? ` (${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%)` : ''}`,
          `Unrealized on held positions: ${profitLoss.totalProfitChf == null ? '\u2014' : formatSignedCurrency(profitLoss.totalProfitChf, 'CHF')}${profitLoss.totalProfitPct != null ? ` (${formatPercent(profitLoss.totalProfitPct)})` : ''}`,
        ]
      : [
          `Unrealized profit: ${profitLoss.totalProfitChf == null ? '\u2014' : formatSignedCurrency(profitLoss.totalProfitChf, 'CHF')}`,
          `Unrealized profit %: ${profitLoss.totalProfitPct == null && metrics.sincePurchasePct == null ? '\u2014' : formatPercent(profitLoss.totalProfitPct ?? metrics.sincePurchasePct)}`,
        ]),
    '',
    'Portfolio value windows (reference only)',
    'Historical value-anchor deltas only; not cash-flow-adjusted performance.',
    'Window | Change CHF | Change % | Coverage',
    '---|---|---|---',
    ...portfolioWindowEntries(summary).map(([label, window]) => `${label} | ${formatWindowValue(window, 'currency')} | ${formatWindowValue(window, 'percent')} | ${renderWindowAvailability(window)}`),
    '',
    'Holdings',
  ];

  if (!rows.length) {
    lines.push('No holdings data available.');
  } else {
    lines.push('Instrument | Value CHF | Cost basis CHF | Since purchase | 7d | 30d | YTD | 365d | Weight %');
    lines.push('---|---|---|---|---|---|---|---|---');
    let totalValue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    for (const row of rows) {
      const costBasis = holdingCostBasisChf(row);
      const gainChf = Number(row.gainSincePurchaseChf);
      const valueChf = Number(row.valueChf || 0);
      const weight = investedChf && investedChf > 0 ? Number(((valueChf / investedChf) * 100).toFixed(1)) : null;
      const windows = row.performanceWindows || {};
      totalValue += valueChf;
      if (Number.isFinite(costBasis)) totalCost += costBasis;
      if (Number.isFinite(gainChf)) totalProfit += gainChf;
      lines.push(`${row.symbol || '\u2014'} | ${formatCurrency(row.valueChf, 'CHF')} | ${costBasis == null ? '\u2014' : formatCurrency(costBasis, 'CHF')} | ${formatWindowValue(windows.sincePurchase, 'currency')} / ${formatWindowValue(windows.sincePurchase, 'percent')} | ${formatWindowValue(windows.last7d, 'currency')} | ${formatWindowValue(windows.last30d, 'currency')} | ${formatWindowValue(windows.ytd, 'currency')} | ${formatWindowValue(windows.last365d, 'currency')} | ${weight == null ? '\u2014' : `${weight}%`}`);
    }
    const totalProfitPct = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : null;
    lines.push(`TOTAL | ${formatCurrency(totalValue, 'CHF')} | ${formatCurrency(totalCost, 'CHF')} | ${formatSignedCurrency(totalProfit, 'CHF')} / ${totalProfitPct == null ? '\u2014' : formatPercent(totalProfitPct)} | — | — | — | — | 100%`);
  }

  lines.push('');
  lines.push(`Generated ${new Date().toISOString().slice(0, 16)} UTC`);
  lines.push('Automated portfolio snapshot — OpenClaw Portfolio Manager');
  return lines.join('\n');
}

function buildReportEmailHtml({ portfolioName, period, summaryHtml, summary = null, deliveryStatus = null, topBlocker = null, nextAction = null, portfolioDir = null }) {
  const metrics = buildInvestorMetrics(summary);
  const profitLoss = summary?.profitLoss?.totals || {};
  const rows = investorHoldingRows(summary);
  const investedChf = Number.isFinite(metrics.investedChf) ? metrics.investedChf : null;

  // Load deposits ledger for true "total return vs net deposited capital".
  let netDepositedChf = null;
  let cumulativeDepositsChf = null;
  let cumulativeWithdrawalsChf = null;
  if (portfolioDir) {
    try {
      const dl = loadDepositsLedger(portfolioDir);
      if (dl && !dl.missing) {
        netDepositedChf = Number(dl.totals.netDepositedChf);
        cumulativeDepositsChf = Number(dl.totals.cumulativeDepositsChf);
        cumulativeWithdrawalsChf = Number(dl.totals.cumulativeWithdrawalsChf);
      }
    } catch (_err) { /* ignore */ }
  }
  const hasNetDeposits = Number.isFinite(netDepositedChf) && netDepositedChf > 0;
  const hasWithdrawals = Number.isFinite(cumulativeWithdrawalsChf) && cumulativeWithdrawalsChf > 0;
  const totalReturnChf = hasNetDeposits && Number.isFinite(metrics.totalValueChf)
    ? Number((metrics.totalValueChf - netDepositedChf).toFixed(2))
    : null;
  const totalReturnPct = hasNetDeposits && totalReturnChf != null
    ? Number(((totalReturnChf / netDepositedChf) * 100).toFixed(2))
    : null;

  // Headline P/L — prefer total return vs deposits when ledger is present;
  // fall back to unrealized cost-basis P/L when the ledger isn't wired up yet.
  const headlineLabel = hasNetDeposits ? 'Total return vs deposits' : 'Unrealized Profit / Loss';
  const headlineChf = hasNetDeposits ? totalReturnChf : (profitLoss.totalProfitChf ?? metrics.sincePurchaseChf);
  const headlinePct = hasNetDeposits ? totalReturnPct : (profitLoss.totalProfitPct ?? metrics.sincePurchasePct);
  const headlinePositive = Number(headlineChf) >= 0;

  // Hero card — portfolio value snapshot. When the ledger is present, show
  // "Net deposited" instead of "Invested" (current-position cost basis), so
  // the operator-visible math reconciles with money actually put in.
  // When withdrawals exist, expand to a Deposits/Withdrawals/Net stack.
  const investedLabel = hasNetDeposits ? 'Net deposited' : 'Invested';
  const investedDisplay = hasNetDeposits ? netDepositedChf : metrics.investedChf;
  const withdrawalDetail = hasNetDeposits && hasWithdrawals
    ? `<div style="margin-top:6px;font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.78);font-weight:600;">Deposits ${escapeHtml(formatCurrency(cumulativeDepositsChf, 'CHF'))} · Withdrawals ${escapeHtml(formatCurrency(cumulativeWithdrawalsChf, 'CHF'))}</div>`
    : '';
  const heroCard = `
    <div style="margin:0 0 16px;padding:28px 24px 24px;background:linear-gradient(135deg, #1e293b 0%, #334155 100%);border-radius:16px;color:#f1f5f9;">
      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.7;font-weight:700;margin-bottom:6px;">Total portfolio value</div>
      <div style="font-size:38px;line-height:1.1;font-weight:800;color:#ffffff;margin-bottom:16px;">${escapeHtml(formatCurrency(metrics.totalValueChf, 'CHF'))}</div>
      <table role="presentation" style="width:100%;border-collapse:collapse;"><tr>
        <td style="padding:0 16px 0 0;vertical-align:top;">
          <div style="font-size:11px;letter-spacing:0.05em;text-transform:uppercase;opacity:0.65;font-weight:700;margin-bottom:4px;">Cash</div>
          <div style="font-size:20px;font-weight:800;color:#ffffff;">${escapeHtml(formatCurrency(metrics.cashChf, 'CHF'))}</div>
        </td>
        <td style="padding:0;vertical-align:top;">
          <div style="font-size:11px;letter-spacing:0.05em;text-transform:uppercase;opacity:0.65;font-weight:700;margin-bottom:4px;">${escapeHtml(investedLabel)}</div>
          <div style="font-size:20px;font-weight:800;color:#ffffff;">${escapeHtml(formatCurrency(investedDisplay, 'CHF'))}</div>
          ${withdrawalDetail}
        </td>
      </tr></table>
    </div>`;

  // Profit/loss strip — reflects total return when the deposits ledger is wired in.
  const profitStripBg = headlinePositive ? '#f0fdf4' : '#fef2f2';
  const profitStripBorder = headlinePositive ? '#86efac' : '#fecaca';
  const profitStripColor = headlinePositive ? '#166534' : '#991b1b';
  const profitStrip = `
    <div style="margin:0 0 16px;padding:18px 22px;background:${profitStripBg};border:1px solid ${profitStripBorder};border-radius:14px;">
      <table role="presentation" style="width:100%;border-collapse:collapse;"><tr>
        <td style="padding:0;vertical-align:middle;">
          <div style="font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:${profitStripColor};font-weight:700;margin-bottom:4px;">${escapeHtml(headlineLabel)}</div>
          <div style="font-size:26px;font-weight:800;color:${profitStripColor};line-height:1.15;">${escapeHtml(headlineChf == null ? '\u2014' : formatSignedCurrency(headlineChf, 'CHF'))}</div>
          ${hasNetDeposits ? `<div style="margin-top:6px;font-size:12px;color:${profitStripColor};opacity:0.8;">on net deposited ${escapeHtml(formatCurrency(netDepositedChf, 'CHF'))}${profitLoss.totalProfitChf != null ? ` — of which ${escapeHtml(formatSignedCurrency(profitLoss.totalProfitChf, 'CHF'))} unrealized on held positions` : ''}</div>` : ''}
        </td>
        <td style="padding:0;vertical-align:middle;text-align:right;">
          <div style="font-size:26px;font-weight:800;color:${profitStripColor};line-height:1.15;">${escapeHtml(headlinePct == null ? '' : formatPercent(headlinePct))}</div>
        </td>
      </tr></table>
    </div>`;

  const portfolioWindowsRows = portfolioWindowEntries(summary).map(([label, window], index) => {
    const rowBg = index % 2 === 1 ? '#f8fafc' : '#ffffff';
    return `<tr style="background:${rowBg};">
      <td style="padding:10px 10px 10px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#0f172a;font-weight:700;">${escapeHtml(label)}</td>
      <td style="padding:10px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#0f172a;white-space:nowrap;">${escapeHtml(formatWindowValue(window, 'currency'))}</td>
      <td style="padding:10px;border-bottom:1px solid #f1f5f9;text-align:right;font-size:13px;color:#0f172a;white-space:nowrap;">${escapeHtml(formatWindowValue(window, 'percent'))}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;text-align:right;font-size:12px;color:#64748b;white-space:nowrap;">${escapeHtml(renderWindowAvailability(window))}</td>
    </tr>`;
  }).join('');
  const portfolioWindowsTable = `<div style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">Portfolio value windows (reference only)</div><div style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#64748b;">Historical value-anchor deltas only. These windows do not neutralize deposits or withdrawals, and should not be read as time-weighted or money-weighted return.</div><div style="margin:0 0 16px;overflow-x:auto;"><table style="width:100%;min-width:520px;border-collapse:collapse;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
    <tr style="background:#f8fafc;">
      <th style="padding:12px 10px 10px 0;text-align:left;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">Window</th>
      <th style="padding:12px 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">Change CHF</th>
      <th style="padding:12px 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">Change %</th>
      <th style="padding:12px 0 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">Coverage</th>
    </tr>${portfolioWindowsRows}</table></div>`;

  // Holdings table
  let holdingsTable;
  if (!rows.length) {
    holdingsTable = '<div style="padding:14px 15px;background:#ffffff;border:1px solid #dbe4f0;border-radius:14px;color:#475569;line-height:1.6;">No holdings data available.</div>';
  } else {
    const headerRow = `<tr style="background:#f8fafc;">
      <th style="padding:12px 10px 10px 0;text-align:left;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">Instrument</th>
      <th style="padding:12px 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">Value CHF</th>
      <th style="padding:12px 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">Cost basis CHF</th>
      <th style="padding:12px 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">Since purchase</th>
      <th style="padding:12px 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">7d</th>
      <th style="padding:12px 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">30d</th>
      <th style="padding:12px 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">YTD</th>
      <th style="padding:12px 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">365d</th>
      <th style="padding:12px 0 10px 10px;text-align:right;border-bottom:2px solid #cbd5e1;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:800;">Weight %</th>
    </tr>`;

    let totalValue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    const bodyRows = rows.map((row, index) => {
      const costBasis = holdingCostBasisChf(row);
      const gainChf = Number(row.gainSincePurchaseChf);
      const gainPct = Number(row.gainSincePurchasePct);
      const valueChf = Number(row.valueChf || 0);
      const weight = investedChf && investedChf > 0 ? Number(((valueChf / investedChf) * 100).toFixed(1)) : null;
      const windows = row.performanceWindows || {};
      const gainColor = gainChf > 0 || gainPct > 0 ? '#166534' : gainChf < 0 || gainPct < 0 ? '#991b1b' : '#334155';
      const rowBg = index % 2 === 1 ? '#f8fafc' : '#ffffff';
      totalValue += valueChf;
      if (Number.isFinite(costBasis)) totalCost += costBasis;
      if (Number.isFinite(gainChf)) totalProfit += gainChf;
      return `<tr style="background:${rowBg};">
        <td style="padding:11px 10px 11px 0;border-bottom:1px solid #f1f5f9;vertical-align:top;">
          <div style="font-size:13px;font-weight:700;color:#0f172a;">${escapeHtml(row.symbol || '\u2014')}</div>
          <div style="margin-top:2px;font-size:11px;line-height:1.4;color:#64748b;">${escapeHtml(row.name || '')}</div>
        </td>
        <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:top;font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;">${escapeHtml(formatCurrency(row.valueChf, 'CHF'))}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:top;font-size:13px;color:#475569;white-space:nowrap;">${escapeHtml(costBasis == null ? '\u2014' : formatCurrency(costBasis, 'CHF'))}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:top;font-size:13px;font-weight:700;color:${gainColor};white-space:nowrap;">${escapeHtml(`${formatWindowValue(windows.sincePurchase, 'currency')} / ${formatWindowValue(windows.sincePurchase, 'percent')}`)}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:top;font-size:13px;color:#475569;white-space:nowrap;">${escapeHtml(formatWindowValue(windows.last7d, 'currency'))}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:top;font-size:13px;color:#475569;white-space:nowrap;">${escapeHtml(formatWindowValue(windows.last30d, 'currency'))}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:top;font-size:13px;color:#475569;white-space:nowrap;">${escapeHtml(formatWindowValue(windows.ytd, 'currency'))}</td>
        <td style="padding:11px 10px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:top;font-size:13px;color:#475569;white-space:nowrap;">${escapeHtml(formatWindowValue(windows.last365d, 'currency'))}</td>
        <td style="padding:11px 0 11px 10px;border-bottom:1px solid #f1f5f9;text-align:right;vertical-align:top;font-size:13px;color:#0f172a;white-space:nowrap;">${escapeHtml(weight == null ? '\u2014' : `${weight}%`)}</td>
      </tr>`;
    }).join('');

    const totalProfitPct = totalCost > 0 ? Number(((totalProfit / totalCost) * 100).toFixed(1)) : null;
    const totalGainColor = totalProfit >= 0 ? '#166534' : '#991b1b';
    const sumRow = `<tr style="background:#f8fafc;">
      <td style="padding:12px 10px 12px 0;border-top:2px solid #cbd5e1;font-size:13px;font-weight:800;color:#0f172a;">TOTAL</td>
      <td style="padding:12px 10px;border-top:2px solid #cbd5e1;text-align:right;font-size:13px;font-weight:800;color:#0f172a;white-space:nowrap;">${escapeHtml(formatCurrency(totalValue, 'CHF'))}</td>
      <td style="padding:12px 10px;border-top:2px solid #cbd5e1;text-align:right;font-size:13px;font-weight:700;color:#475569;white-space:nowrap;">${escapeHtml(formatCurrency(totalCost, 'CHF'))}</td>
      <td style="padding:12px 10px;border-top:2px solid #cbd5e1;text-align:right;font-size:13px;font-weight:800;color:${totalGainColor};white-space:nowrap;">${escapeHtml(`${formatSignedCurrency(totalProfit, 'CHF')} / ${totalProfitPct == null ? '\u2014' : formatPercent(totalProfitPct)}`)}</td>
      <td style="padding:12px 10px;border-top:2px solid #cbd5e1;text-align:right;font-size:13px;color:#475569;white-space:nowrap;">—</td>
      <td style="padding:12px 10px;border-top:2px solid #cbd5e1;text-align:right;font-size:13px;color:#475569;white-space:nowrap;">—</td>
      <td style="padding:12px 10px;border-top:2px solid #cbd5e1;text-align:right;font-size:13px;color:#475569;white-space:nowrap;">—</td>
      <td style="padding:12px 10px;border-top:2px solid #cbd5e1;text-align:right;font-size:13px;color:#475569;white-space:nowrap;">—</td>
      <td style="padding:12px 0 12px 10px;border-top:2px solid #cbd5e1;text-align:right;font-size:13px;font-weight:800;color:#0f172a;">100%</td>
    </tr>`;

    holdingsTable = `<div style="margin:0 0 16px;overflow-x:auto;"><table style="width:100%;min-width:980px;border-collapse:collapse;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">${headerRow}${bodyRows}${sumRow}</table></div>`;
  }

  const generatedAt = new Date().toISOString().slice(0, 16);
  const footer = `<div style="padding:14px 0;text-align:center;font-size:12px;color:#94a3b8;line-height:1.6;">Generated ${escapeHtml(generatedAt)} UTC &nbsp;•&nbsp; Automated portfolio snapshot</div>`;

  return page({
    eyebrow: `${portfolioName} Portfolio`,
    title: `${period} snapshot`,
    subtitle: `${formatCurrency(metrics.totalValueChf, 'CHF')} total value`,
    accent: '#1e293b',
    bodyHtml: `${heroCard}${profitStrip}${portfolioWindowsTable}${holdingsTable}${footer}`,
    footer: 'OpenClaw Portfolio Manager',
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
