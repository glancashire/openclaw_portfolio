'use strict';

const {
  escapeHtml,
  formatCurrency,
  formatPercent,
  page,
  card,
  badge,
  metricGrid,
  kvTable,
  dataTable,
} = require('../src/reporting/emailHtml');
const { normalizeFilledTrade } = require('../src/reporting/investorReportingData');

function formatSignedCurrency(value, currency = 'CHF') {
  if (!Number.isFinite(Number(value))) return '—';
  const numeric = Number(value);
  const prefix = numeric > 0 ? '+' : '';
  return `${prefix}${formatCurrency(numeric, currency)}`;
}

function buildTradeManagementSummary(trade, portfolio, openOrders = []) {
  const isBuy = String(trade.action || '').toUpperCase() === 'BUY';
  const actionLabel = isBuy ? 'buy' : 'sale';
  const symbol = trade.symbol || 'Instrument';
  const fillQty = Number(trade.fillQty || trade.qty || 0);
  const costChf = Number(trade.costChf || 0);
  const totalValueChf = Number(portfolio.totalValueChf || 0);
  const cashChf = Number(portfolio.cashChf || 0);
  const openCount = Array.isArray(openOrders) ? openOrders.length : 0;

  const clauses = [
    `${symbol} ${actionLabel} filled for ${fillQty || 'the requested'} unit(s) at ${trade.fillPrice || trade.price || 'unknown price'} ${trade.currency || ''}`.trim(),
    Number.isFinite(costChf) ? `gross trade impact is ${formatSignedCurrency(isBuy ? -Math.abs(costChf) : Math.abs(costChf), 'CHF')}` : null,
    Number.isFinite(totalValueChf) ? `portfolio value now stands at ${formatCurrency(totalValueChf, 'CHF')}` : null,
    Number.isFinite(cashChf) ? `cash balance is ${formatCurrency(cashChf, 'CHF')}` : null,
    openCount > 0 ? `${openCount} other order(s) remain open` : 'no other open orders remain',
  ].filter(Boolean);

  return clauses.join('; ') + '.';
}

function buildHoldingsRows(holdings = []) {
  return holdings.map((holding) => ([
    escapeHtml(holding.symbol || '—'),
    escapeHtml(holding.name || ''),
    escapeHtml(formatCurrency(holding.valueChf, 'CHF')),
    escapeHtml(formatPercent(holding.allocPct)),
    escapeHtml(formatPercent(holding.targetPct)),
    `<span style="color:${Number(holding.driftPct) > 0 ? '#166534' : Number(holding.driftPct) < 0 ? '#991b1b' : '#6b7280'};font-weight:600;">${escapeHtml(formatPercent(holding.driftPct))}</span>`,
  ]));
}

function availabilityText(value, fallback = 'Unavailable') {
  return value == null || value === '' ? fallback : value;
}

function buildNormalizedTradeContext(trade, portfolio) {
  const normalizedTrade = normalizeFilledTrade({ trade, holdingsRows: Array.isArray(portfolio?.holdings) ? portfolio.holdings : [] });
  return {
    normalizedTrade,
    symbol: normalizedTrade.symbol || trade.symbol || 'Instrument',
    name: normalizedTrade.name || trade.name || 'Name unavailable',
    quantityPurchased: normalizedTrade.quantityPurchased,
    pricePerUnit: normalizedTrade.pricePerUnit,
    totalCost: normalizedTrade.totalCost,
    costChfIncludingCommission: normalizedTrade.costChfIncludingCommission,
    totalHeldAfterFill: normalizedTrade.resultingTotalHeld,
  };
}

function buildTradeEmailHtml(trade, portfolio, openOrders = []) {
  const isBuy = String(trade.action || '').toUpperCase() === 'BUY';
  const accent = isBuy ? '#166534' : '#991b1b';
  const title = `${trade.symbol} fill confirmed`;
  const subtitle = `${portfolio.name} • ${trade.time || new Date().toISOString().slice(0, 16)}`;
  const actionBadge = badge({ label: isBuy ? 'BUY filled' : 'SELL filled', tone: isBuy ? 'success' : 'danger' });
  const managementSummary = buildTradeManagementSummary(trade, portfolio, openOrders);
  const grossTradeImpact = Number(trade.costChf || 0) * (isBuy ? -1 : 1);
  const investorTrade = buildNormalizedTradeContext(trade, portfolio);

  const summaryCard = card({
    title: 'Management summary',
    contentHtml: `
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">${actionBadge}${badge({ label: openOrders.length ? `${openOrders.length} open order(s)` : 'No open orders', tone: openOrders.length ? 'warn' : 'success' })}</div>
      <div style="margin:0 0 16px;padding:18px 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;">
        <div style="font-size:12px;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:8px;">Investor take</div>
        <div style="font-size:17px;line-height:1.7;color:#0f172a;font-weight:600;">${escapeHtml(managementSummary)}</div>
      </div>
      ${metricGrid([
        { label: 'Gross trade impact', value: formatSignedCurrency(grossTradeImpact, 'CHF'), detail: `Fees ${formatCurrency(trade.fees || 0, 'CHF')}` },
        { label: 'Portfolio value', value: formatCurrency(portfolio.totalValueChf, 'CHF') },
        { label: 'Cash balance', value: formatCurrency(portfolio.cashChf, 'CHF') },
        { label: 'Fill quantity', value: String(trade.fillQty || trade.qty || '—'), detail: `${trade.fillPrice || trade.price || '—'} ${trade.currency || ''}`.trim() },
      ])}
    `,
  });

  const purchaseCard = card({
    title: 'Purchase summary',
    contentHtml: kvTable([
      { label: 'Symbol', value: investorTrade.symbol },
      { label: 'Name', value: investorTrade.name },
      { label: 'Quantity purchased', value: investorTrade.quantityPurchased == null ? 'Unavailable' : String(investorTrade.quantityPurchased) },
      { label: 'Price per unit', value: investorTrade.pricePerUnit == null ? 'Unavailable' : formatCurrency(investorTrade.pricePerUnit, trade.currency || 'CHF') },
      { label: 'Total cost', value: investorTrade.totalCost == null ? 'Unavailable' : formatCurrency(investorTrade.totalCost, 'CHF') },
      { label: 'Cost in CHF including commission', value: investorTrade.costChfIncludingCommission == null ? 'Unavailable' : formatCurrency(investorTrade.costChfIncludingCommission, 'CHF') },
      { label: 'Resulting total held', value: investorTrade.totalHeldAfterFill == null ? 'Unavailable' : String(investorTrade.totalHeldAfterFill) },
    ]),
  });

  const actionCard = card({
    title: 'Immediate follow-up',
    contentHtml: `
      <div style="margin:0 0 12px;padding:16px 18px;background:#fff7ed;border:1px solid #fdba74;border-radius:12px;">
        <div style="font-size:12px;color:#9a3412;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;margin-bottom:6px;">What changed</div>
        <div style="font-size:16px;font-weight:700;color:#7c2d12;line-height:1.5;">${escapeHtml(isBuy ? 'Cash decreased and the filled instrument weight increased.' : 'Cash increased and the filled instrument weight decreased.')}</div>
      </div>
      <div style="margin:0;padding:16px 18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;line-height:1.6;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;margin-bottom:6px;">Open orders</div>
        <div style="font-size:15px;color:#111827;">${escapeHtml(openOrders.length ? `${openOrders.length} remaining order(s) still require monitoring.` : 'No remaining open orders require monitoring.')}</div>
      </div>
    `,
  });

  const detailsCard = card({
    title: 'Execution detail',
    contentHtml: kvTable([
      { label: 'Symbol', value: trade.symbol || '—' },
      { label: 'Action', htmlValue: actionBadge },
      { label: 'Requested quantity', value: String(trade.qty || '—') },
      { label: 'Filled quantity', value: String(trade.fillQty || trade.qty || '—') },
      { label: 'Fill price', value: `${trade.fillPrice || trade.price || '—'} ${trade.currency || ''}`.trim() },
      { label: 'Gross cost', value: formatCurrency(trade.costChf, 'CHF') },
      { label: 'Order ID', value: trade.orderId || '—' },
      { label: 'Timestamp', value: trade.time || '—' },
    ]),
  });

  const portfolioCard = card({
    title: 'Portfolio after fill',
    contentHtml: `
      <div style="margin:0 0 16px;">${metricGrid([
        { label: 'Portfolio value', value: formatCurrency(portfolio.totalValueChf, 'CHF') },
        { label: 'Cash balance', value: formatCurrency(portfolio.cashChf, 'CHF') },
      ])}</div>
      <div style="margin-top:16px;">${dataTable({
        columns: [
          { label: 'Symbol' },
          { label: 'Name' },
          { label: 'Value', align: 'right' },
          { label: 'Alloc', align: 'right' },
          { label: 'Target', align: 'right' },
          { label: 'Drift', align: 'right' },
        ],
        rows: buildHoldingsRows(portfolio.holdings || []),
      })}</div>
    `,
  });

  const openOrdersCard = card({
    title: 'Remaining open orders',
    contentHtml: dataTable({
      columns: [
        { label: 'Symbol' },
        { label: 'Action' },
        { label: 'Qty', align: 'right' },
        { label: 'Limit', align: 'right' },
        { label: 'Status' },
      ],
      rows: openOrders.map((order) => ([
        escapeHtml(order.symbol || '—'),
        escapeHtml(order.action || '—'),
        escapeHtml(String(order.qty || '—')),
        escapeHtml(`${order.limitPrice || '—'} ${order.currency || ''}`.trim()),
        escapeHtml(order.status || '—'),
      ])),
    }),
  });

  return page({
    eyebrow: 'OpenClaw Portfolio Manager',
    title,
    subtitle,
    accent,
    bodyHtml: `${summaryCard}${purchaseCard}${actionCard}${portfolioCard}${detailsCard}${openOrdersCard}`,
    footer: 'OpenClaw Portfolio Manager • Interactive Brokers delivery surface',
  });
}

function buildTradeEmailText(trade, portfolio, openOrders = []) {
  const investorTrade = buildNormalizedTradeContext(trade, portfolio);
  return [
    `${trade.symbol} ${trade.action} fill confirmed`,
    '',
    'Purchase summary',
    `Symbol: ${availabilityText(investorTrade.symbol, 'Unavailable')}`,
    `Name: ${availabilityText(investorTrade.name, 'Unavailable')}`,
    `Quantity purchased: ${investorTrade.quantityPurchased == null ? 'Unavailable' : investorTrade.quantityPurchased}`,
    `Price per unit: ${investorTrade.pricePerUnit == null ? 'Unavailable' : formatCurrency(investorTrade.pricePerUnit, trade.currency || 'CHF')}`,
    `Total cost: ${investorTrade.totalCost == null ? 'Unavailable' : formatCurrency(investorTrade.totalCost, 'CHF')}`,
    `Cost in CHF including commission: ${investorTrade.costChfIncludingCommission == null ? 'Unavailable' : formatCurrency(investorTrade.costChfIncludingCommission, 'CHF')}`,
    `Resulting total held: ${investorTrade.totalHeldAfterFill == null ? 'Unavailable' : investorTrade.totalHeldAfterFill}`,
    '',
    `Gross trade impact: CHF ${Number(trade.costChf || 0).toFixed(2)}`,
    `Portfolio value: CHF ${portfolio && Number.isFinite(Number(portfolio.totalValueChf)) ? Number(portfolio.totalValueChf).toFixed(2) : '—'}`,
    `Cash balance: CHF ${portfolio && Number.isFinite(Number(portfolio.cashChf)) ? Number(portfolio.cashChf).toFixed(2) : '—'}`,
    openOrders.length ? `Remaining open orders: ${openOrders.length}` : 'Remaining open orders: none',
  ].join('\n');
}

module.exports = { buildTradeEmailHtml, buildTradeEmailText, buildTradeManagementSummary };
