'use strict';

const fs = require('fs');
const path = require('path');
const {
  escapeHtml,
  formatCurrency,
  formatPercent,
  page,
  card,
  badge,
  kvTable,
  dataTable,
  bulletList,
} = require('../src/reporting/emailHtml');
const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
const { normalizeFilledTrade, parseHoldingsTable } = require('../src/reporting/investorReportingData');

function formatSignedCurrency(value, currency = 'CHF') {
  if (!Number.isFinite(Number(value))) return '—';
  const numeric = Number(value);
  if (numeric === 0) return formatCurrency(0, currency);
  return `${numeric > 0 ? '+' : '-'}${formatCurrency(Math.abs(numeric), currency)}`;
}

function availabilityText(value, fallback = 'Unavailable') {
  return value == null || value === '' ? fallback : value;
}

function identityKey(value) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw || raw === '—') return null;
  return raw.toUpperCase();
}

function identityValues(row = {}) {
  return [
    row.tickerOrIsin,
    row.symbol,
    row.name,
    row.conid,
    row.ibkrConid,
    row.ibkrSymbol,
    row.ibkrLocalSymbol,
    row.localSymbol,
  ].filter(Boolean);
}

function loadApprovedInstruments(portfolioDir = '') {
  if (!portfolioDir) return [];
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  if (!fs.existsSync(portfolioPath)) return [];
  try {
    return readApprovedInstruments(portfolioPath);
  } catch {
    return [];
  }
}

function loadSnapshotHoldings(portfolioDir = '') {
  if (!portfolioDir) return [];
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  if (!fs.existsSync(holdingsPath)) return [];
  try {
    return parseHoldingsTable(fs.readFileSync(holdingsPath, 'utf8'));
  } catch {
    return [];
  }
}

function findApprovedInstrument(values = [], approvedInstruments = []) {
  const keys = new Set(values.map(identityKey).filter(Boolean));
  return (approvedInstruments || []).find((instrument) => identityValues(instrument).some((value) => keys.has(identityKey(value)))) || null;
}

function findSnapshotHolding(values = [], snapshotRows = []) {
  const keys = new Set(values.map(identityKey).filter(Boolean));
  return (snapshotRows || []).find((row) => identityValues(row).some((value) => keys.has(identityKey(value)))) || null;
}

function numericValue(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function enrichHoldingRow(row = {}, approvedInstruments = [], snapshotRows = []) {
  const approved = findApprovedInstrument(identityValues(row), approvedInstruments);
  const snapshot = findSnapshotHolding([...identityValues(row), ...identityValues(approved || {})], snapshotRows);
  return {
    symbol: row.symbol || approved?.ibkrLocalSymbol || approved?.ibkrSymbol || approved?.tickerOrIsin || snapshot?.symbol || snapshot?.tickerOrIsin || '—',
    name: row.name || approved?.name || snapshot?.name || row.symbol || approved?.ibkrLocalSymbol || approved?.ibkrSymbol || 'Unnamed instrument',
    quantityHeld: numericValue(row.quantityHeld, row.quantity, row.position, snapshot?.quantity, snapshot?.quantityHeld),
    valueChf: numericValue(row.valueChf, row.marketValue, snapshot?.valueChf),
    allocationPct: numericValue(row.allocPct, row.allocationPct, snapshot?.allocationPct),
    targetPct: numericValue(row.targetPct, snapshot?.targetPct, approved?.target),
    driftPct: numericValue(row.driftPct, snapshot?.driftPct),
    tickerOrIsin: row.tickerOrIsin || snapshot?.tickerOrIsin || approved?.tickerOrIsin || null,
    conid: row.conid || approved?.ibkrConid || snapshot?.conid || null,
  };
}

function enrichedPortfolio(portfolio = {}, portfolioDir = '') {
  const approvedInstruments = loadApprovedInstruments(portfolioDir);
  const snapshotRows = loadSnapshotHoldings(portfolioDir);
  const holdings = Array.isArray(portfolio?.holdings) ? portfolio.holdings : [];
  return {
    approvedInstruments,
    snapshotRows,
    portfolio: {
      name: portfolio?.name || 'Portfolio',
      totalValueChf: portfolio?.totalValueChf,
      cashChf: portfolio?.cashChf,
      holdings: holdings.map((row) => enrichHoldingRow(row, approvedInstruments, snapshotRows))
        .sort((a, b) => Number(b.valueChf || 0) - Number(a.valueChf || 0)),
    },
  };
}

function buildNormalizedTradeContext(trade, portfolio, { portfolioDir = '' } = {}) {
  const { approvedInstruments, snapshotRows, portfolio: normalizedPortfolio } = enrichedPortfolio(portfolio, portfolioDir);
  const holdingsRows = normalizedPortfolio.holdings.length ? normalizedPortfolio.holdings : snapshotRows;
  const normalizedTrade = normalizeFilledTrade({ trade, holdingsRows, approvedInstruments });
  const displaySymbol = normalizedTrade.symbol || trade.symbol || trade.tickerOrIsin || 'Instrument';
  const displayName = normalizedTrade.name || trade.name || trade.instrument || displaySymbol;
  return {
    trade: {
      ...trade,
      symbol: displaySymbol,
      name: displayName,
    },
    portfolio: normalizedPortfolio,
    investorTrade: {
      ...normalizedTrade,
      symbol: displaySymbol,
      name: displayName,
    },
    approvedInstruments,
    snapshotRows,
  };
}

function buildTradeManagementSummary(context, openOrders = []) {
  const { trade, portfolio, investorTrade } = context;
  const isBuy = String(trade.action || '').toUpperCase() === 'BUY';
  const actionLabel = isBuy ? 'buy' : 'sale';
  const qty = investorTrade.quantityPurchased || trade.fillQty || trade.qty || 'the requested';
  const price = investorTrade.pricePerUnit == null ? 'unknown price' : formatCurrency(investorTrade.pricePerUnit, trade.currency || investorTrade.currency || 'CHF');
  const clauses = [
    `${investorTrade.name} ${actionLabel} filled for ${qty} unit(s) at ${price}`,
    Number.isFinite(Number(portfolio.totalValueChf)) ? `portfolio value after the fill is ${formatCurrency(portfolio.totalValueChf, 'CHF')}` : null,
    Number.isFinite(Number(portfolio.cashChf)) ? `cash after the fill is ${formatCurrency(portfolio.cashChf, 'CHF')}` : null,
    openOrders.length > 0 ? `${openOrders.length} open order(s) still remain` : null,
  ].filter(Boolean);
  return clauses.join('; ') + '.';
}

function buildAfterFillFacts(context, openOrders = []) {
  const { trade, portfolio, investorTrade } = context;
  const matchedHolding = (portfolio.holdings || []).find((row) => identityKey(row.symbol) === identityKey(investorTrade.symbol));
  const facts = [];
  const action = String(trade.action || '').toUpperCase();
  if (investorTrade.resultingTotalHeld != null) {
    if (action === 'BUY') {
      facts.push(`${investorTrade.symbol} increased to ${investorTrade.resultingTotalHeld} unit(s).`);
    } else if (action === 'SELL') {
      facts.push(`${investorTrade.symbol} now stands at ${investorTrade.resultingTotalHeld} unit(s).`);
    } else {
      facts.push(`${investorTrade.symbol} now stands at ${investorTrade.resultingTotalHeld} unit(s).`);
    }
  }
  if (matchedHolding && Number.isFinite(Number(matchedHolding.allocationPct))) {
    facts.push(`${investorTrade.symbol} now represents ${Number(matchedHolding.allocationPct).toFixed(1)}% of the portfolio.`);
  }
  if (Number.isFinite(Number(portfolio.cashChf))) {
    facts.push(`Cash after this fill is ${formatCurrency(portfolio.cashChf, 'CHF')}.`);
  }
  if (openOrders.length > 0) {
    const symbols = openOrders.map((order) => order.symbol).filter(Boolean).slice(0, 3).join(', ');
    facts.push(`${openOrders.length} open order(s) remain${symbols ? `: ${symbols}` : ''}.`);
  }
  return facts;
}

function hasDistinctCommissionRow(investorTrade) {
  if (!Number.isFinite(Number(investorTrade.totalCost)) || !Number.isFinite(Number(investorTrade.costChfIncludingCommission))) return false;
  return Math.abs(Number(investorTrade.totalCost) - Number(investorTrade.costChfIncludingCommission)) >= 0.01;
}

function buildMetricGrid(items = []) {
  const pairs = [];
  for (let index = 0; index < items.length; index += 2) {
    pairs.push(items.slice(index, index + 2));
  }
  return `<table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0 10px;">${pairs.map((pair) => `<tr>${pair.map((item, itemIndex) => `<td style="width:50%;padding:${itemIndex === 0 ? '0 8px 0 0' : '0 0 0 8px'};vertical-align:top;">
    <div style="min-height:110px;padding:14px 14px 12px;background:#ffffff;border:1px solid #dbe4f0;border-radius:14px;box-sizing:border-box;">
      <div style="font-size:11px;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">${escapeHtml(item.label)}</div>
      <div style="font-size:24px;line-height:1.15;font-weight:800;color:#0f172a;word-break:break-word;">${escapeHtml(item.value)}</div>
      ${item.detail ? `<div style="margin-top:6px;font-size:12px;line-height:1.5;color:#475569;">${escapeHtml(item.detail)}</div>` : ''}
    </div>
  </td>`).join('')}${pair.length === 1 ? '<td style="width:50%;padding:0 0 0 8px;vertical-align:top;"><div style="min-height:110px;"></div></td>' : ''}</tr>`).join('')}</table>`;
}

function buildHoldingsRows(holdings = []) {
  return holdings.map((holding) => ([
    escapeHtml(holding.symbol || '—'),
    escapeHtml(holding.name || ''),
    escapeHtml(holding.quantityHeld == null ? '—' : String(holding.quantityHeld)),
    escapeHtml(holding.valueChf == null ? '—' : formatCurrency(holding.valueChf, 'CHF')),
    escapeHtml(holding.allocationPct == null ? '—' : `${Number(holding.allocationPct).toFixed(1)}%`),
  ]));
}

function buildOpenOrdersRows(openOrders = []) {
  return openOrders.map((order) => ([
    escapeHtml(order.symbol || '—'),
    escapeHtml(order.action || '—'),
    escapeHtml(String(order.qty || '—')),
    escapeHtml(`${order.limitPrice || '—'} ${order.currency || ''}`.trim()),
    escapeHtml(order.status || '—'),
  ]));
}

function buildTradeEmailHtml(trade, portfolio, openOrders = [], options = {}) {
  const context = buildNormalizedTradeContext(trade, portfolio, options);
  const isBuy = String(context.trade.action || '').toUpperCase() === 'BUY';
  const accent = isBuy ? '#166534' : '#991b1b';
  const title = `${context.trade.symbol} fill confirmed`;
  const subtitle = `${context.portfolio.name} • ${context.trade.time || new Date().toISOString().slice(0, 16)}`;
  const actionBadge = badge({ label: isBuy ? 'BUY filled' : 'SELL filled', tone: isBuy ? 'success' : 'danger' });
  const summaryCard = card({
    title: 'Fill summary',
    contentHtml: `
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">${actionBadge}${openOrders.length ? badge({ label: `${openOrders.length} open order(s)`, tone: 'warn' }) : ''}</div>
      <div style="margin:0 0 16px;padding:18px 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;">
        <div style="font-size:12px;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:8px;">Investor take</div>
        <div style="font-size:17px;line-height:1.7;color:#0f172a;font-weight:600;">${escapeHtml(buildTradeManagementSummary(context, openOrders))}</div>
      </div>
      ${buildMetricGrid([
        { label: 'Gross trade impact', value: formatSignedCurrency(Number(context.trade.costChf || 0) * (isBuy ? -1 : 1), 'CHF'), detail: Number.isFinite(Number(context.trade.fees)) ? `Fees ${formatCurrency(context.trade.fees, 'CHF')}` : null },
        { label: 'Portfolio value', value: formatCurrency(context.portfolio.totalValueChf, 'CHF') },
        { label: 'Cash balance', value: formatCurrency(context.portfolio.cashChf, 'CHF') },
        { label: 'Fill quantity', value: String(context.trade.fillQty || context.trade.qty || '—'), detail: context.investorTrade.pricePerUnit == null ? null : formatCurrency(context.investorTrade.pricePerUnit, context.trade.currency || context.investorTrade.currency || 'CHF') },
      ])}
    `,
  });

  const purchaseRows = [
    { label: 'Symbol', value: context.investorTrade.symbol },
    { label: 'Name', value: context.investorTrade.name },
    { label: 'Quantity purchased', value: context.investorTrade.quantityPurchased == null ? 'Unavailable' : String(context.investorTrade.quantityPurchased) },
    { label: 'Price per unit', value: context.investorTrade.pricePerUnit == null ? 'Unavailable' : formatCurrency(context.investorTrade.pricePerUnit, context.trade.currency || context.investorTrade.currency || 'CHF') },
    { label: 'Total cost', value: context.investorTrade.totalCost == null ? 'Unavailable' : formatCurrency(context.investorTrade.totalCost, 'CHF') },
    ...(hasDistinctCommissionRow(context.investorTrade)
      ? [{ label: 'Cost in CHF including commission', value: formatCurrency(context.investorTrade.costChfIncludingCommission, 'CHF') }]
      : []),
    { label: 'Resulting total held', value: context.investorTrade.resultingTotalHeld == null ? 'Unavailable' : String(context.investorTrade.resultingTotalHeld) },
  ];

  const purchaseCard = card({
    title: 'Purchase summary',
    contentHtml: kvTable(purchaseRows),
  });

  const afterFillFacts = buildAfterFillFacts(context, openOrders);
  const afterFillCard = afterFillFacts.length
    ? card({
      title: 'After this fill',
      tone: 'surface',
      contentHtml: bulletList(afterFillFacts),
    })
    : '';

  const portfolioCard = card({
    title: 'Portfolio after fill',
    contentHtml: context.portfolio.holdings.length
      ? dataTable({
        columns: [
          { label: 'Symbol' },
          { label: 'Name' },
          { label: 'Units', align: 'right' },
          { label: 'Value CHF', align: 'right' },
          { label: 'Weight', align: 'right' },
        ],
        rows: buildHoldingsRows(context.portfolio.holdings),
      })
      : '<p style="margin:0;color:#475569;line-height:1.6;">Holdings snapshot is not available yet.</p>',
  });

  const openOrdersCard = openOrders.length
    ? card({
      title: 'Remaining open orders',
      contentHtml: dataTable({
        columns: [
          { label: 'Symbol' },
          { label: 'Action' },
          { label: 'Qty', align: 'right' },
          { label: 'Limit', align: 'right' },
          { label: 'Status' },
        ],
        rows: buildOpenOrdersRows(openOrders),
      }),
    })
    : '';

  return page({
    eyebrow: 'OpenClaw Portfolio Manager',
    title,
    subtitle,
    accent,
    bodyHtml: `${summaryCard}${purchaseCard}${afterFillCard}${portfolioCard}${openOrdersCard}`,
    footer: 'OpenClaw Portfolio Manager • Interactive Brokers delivery surface',
  });
}

function buildTradeEmailText(trade, portfolio, openOrders = [], options = {}) {
  const context = buildNormalizedTradeContext(trade, portfolio, options);
  const lines = [
    `${context.trade.symbol} ${context.trade.action} fill confirmed`,
    '',
    'Fill summary',
    buildTradeManagementSummary(context, openOrders),
    '',
    'Purchase summary',
    `Symbol: ${availabilityText(context.investorTrade.symbol, 'Unavailable')}`,
    `Name: ${availabilityText(context.investorTrade.name, 'Unavailable')}`,
    `Quantity purchased: ${context.investorTrade.quantityPurchased == null ? 'Unavailable' : context.investorTrade.quantityPurchased}`,
    `Price per unit: ${context.investorTrade.pricePerUnit == null ? 'Unavailable' : formatCurrency(context.investorTrade.pricePerUnit, context.trade.currency || context.investorTrade.currency || 'CHF')}`,
    `Total cost: ${context.investorTrade.totalCost == null ? 'Unavailable' : formatCurrency(context.investorTrade.totalCost, 'CHF')}`,
  ];
  if (hasDistinctCommissionRow(context.investorTrade)) {
    lines.push(`Cost in CHF including commission: ${formatCurrency(context.investorTrade.costChfIncludingCommission, 'CHF')}`);
  }
  lines.push(`Resulting total held: ${context.investorTrade.resultingTotalHeld == null ? 'Unavailable' : context.investorTrade.resultingTotalHeld}`);
  const afterFillFacts = buildAfterFillFacts(context, openOrders);
  if (afterFillFacts.length) {
    lines.push('', 'After this fill');
    for (const fact of afterFillFacts) lines.push(`- ${fact}`);
  }
  lines.push('', 'Portfolio after fill');
  lines.push(`Portfolio value: CHF ${context.portfolio && Number.isFinite(Number(context.portfolio.totalValueChf)) ? Number(context.portfolio.totalValueChf).toFixed(2) : '—'}`);
  lines.push(`Cash balance: CHF ${context.portfolio && Number.isFinite(Number(context.portfolio.cashChf)) ? Number(context.portfolio.cashChf).toFixed(2) : '—'}`);
  if (context.portfolio.holdings.length) {
    for (const holding of context.portfolio.holdings) {
      lines.push(`${holding.symbol} — ${holding.name}`);
      lines.push(`  Units: ${holding.quantityHeld == null ? '—' : holding.quantityHeld}`);
      lines.push(`  Value CHF: ${holding.valueChf == null ? '—' : formatCurrency(holding.valueChf, 'CHF')}`);
      lines.push(`  Weight: ${holding.allocationPct == null ? '—' : `${Number(holding.allocationPct).toFixed(1)}%`}`);
    }
  } else {
    lines.push('Holdings snapshot is not available yet.');
  }
  if (openOrders.length) {
    lines.push('', `Remaining open orders: ${openOrders.length}`);
  }
  return lines.join('\n');
}

module.exports = { buildTradeEmailHtml, buildTradeEmailText, buildTradeManagementSummary, buildNormalizedTradeContext };
