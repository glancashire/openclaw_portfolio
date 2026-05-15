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

function buildTradeEmailHtml(trade, portfolio, openOrders = []) {
  const isBuy = String(trade.action || '').toUpperCase() === 'BUY';
  const accent = isBuy ? '#166534' : '#991b1b';
  const title = `${trade.symbol} fill confirmed`;
  const subtitle = `${portfolio.name} • ${trade.time || new Date().toISOString().slice(0, 16)}`;
  const actionBadge = badge({ label: isBuy ? 'BUY filled' : 'SELL filled', tone: isBuy ? 'success' : 'danger' });

  const summaryCard = card({
    title: 'Execution summary',
    contentHtml: `
      <div style="margin-bottom:14px;">${actionBadge}</div>
      ${metricGrid([
        { label: 'Filled quantity', value: String(trade.fillQty || trade.qty || '—') },
        { label: 'Fill price', value: `${escapeHtml(String(trade.fillPrice || trade.price || '—'))} ${escapeHtml(String(trade.currency || ''))}`.trim() },
        { label: 'Gross cost', value: formatCurrency(trade.costChf, 'CHF'), detail: `Fees ${formatCurrency(trade.fees || 0, 'CHF')}` },
      ])}
    `,
  });

  const detailsCard = card({
    title: 'Trade details',
    contentHtml: kvTable([
      { label: 'Symbol', value: trade.symbol || '—' },
      { label: 'Action', htmlValue: actionBadge },
      { label: 'Requested quantity', value: String(trade.qty || '—') },
      { label: 'Filled quantity', value: String(trade.fillQty || trade.qty || '—') },
      { label: 'Fill price', value: `${trade.fillPrice || trade.price || '—'} ${trade.currency || ''}`.trim() },
      { label: 'Order ID', value: trade.orderId || '—' },
      { label: 'Timestamp', value: trade.time || '—' },
    ]),
  });

  const holdingsRows = (portfolio.holdings || []).map((holding) => ([
    escapeHtml(holding.symbol || '—'),
    escapeHtml(holding.name || ''),
    escapeHtml(formatCurrency(holding.valueChf, 'CHF')),
    escapeHtml(formatPercent(holding.allocPct)),
    escapeHtml(formatPercent(holding.targetPct)),
    `<span style="color:${Number(holding.driftPct) > 0 ? '#166534' : Number(holding.driftPct) < 0 ? '#991b1b' : '#6b7280'};font-weight:600;">${escapeHtml(formatPercent(holding.driftPct))}</span>`,
  ]));

  const portfolioCard = card({
    title: 'Portfolio after trade',
    contentHtml: `
      ${metricGrid([
        { label: 'Total value', value: formatCurrency(portfolio.totalValueChf, 'CHF') },
        { label: 'Cash balance', value: formatCurrency(portfolio.cashChf, 'CHF') },
      ])}
      <div style="margin-top:16px;">${dataTable({
        columns: [
          { label: 'Symbol' },
          { label: 'Name' },
          { label: 'Value', align: 'right' },
          { label: 'Alloc', align: 'right' },
          { label: 'Target', align: 'right' },
          { label: 'Drift', align: 'right' },
        ],
        rows: holdingsRows,
      })}</div>
    `,
  });

  const openOrdersRows = openOrders.map((order) => ([
    escapeHtml(order.symbol || '—'),
    escapeHtml(order.action || '—'),
    escapeHtml(String(order.qty || '—')),
    escapeHtml(`${order.limitPrice || '—'} ${order.currency || ''}`.trim()),
    escapeHtml(order.status || '—'),
  ]));

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
      rows: openOrdersRows,
    }),
  });

  return page({
    eyebrow: 'OpenClaw Portfolio Manager',
    title,
    subtitle,
    accent,
    bodyHtml: `${summaryCard}${detailsCard}${portfolioCard}${openOrdersCard}`,
    footer: 'OpenClaw Portfolio Manager • Interactive Brokers delivery surface',
  });
}

module.exports = { buildTradeEmailHtml };
