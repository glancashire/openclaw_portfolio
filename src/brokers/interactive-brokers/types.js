function normaliseAccount(raw = {}) {
  return {
    broker: 'interactive-brokers',
    accountId: raw.accountId || raw.id || raw.account || null,
    accountName: raw.accountName || raw.name || raw.account || null,
    accountType: raw.accountType || raw.type || null,
    currency: raw.currency || null,
    status: raw.status || null,
    raw,
  };
}

function normaliseHolding(raw = {}) {
  const contract = raw.contract || raw.summary || {};
  const symbol = raw.symbol || contract.symbol || contract.localSymbol || null;
  const conid = raw.conid || contract.conId || null;
  const quantity = Number(raw.position ?? raw.quantity ?? 0);
  const avgCost = Number(raw.avgCost ?? raw.averageCost ?? 0);
  const explicitPrice = Number(raw.mktPrice ?? raw.price ?? raw.marketPrice ?? 0);
  const price = Number.isFinite(explicitPrice) && explicitPrice > 0
    ? explicitPrice
    : (Number.isFinite(avgCost) && avgCost > 0 ? avgCost : 0);
  const explicitMarketValue = Number(raw.mktValue ?? raw.marketValue);
  const marketValue = Number.isFinite(explicitMarketValue) && explicitMarketValue > 0
    ? explicitMarketValue
    : (Number.isFinite(price) ? price * quantity : 0);

  return {
    broker: 'interactive-brokers',
    identifier: conid || raw.isin || symbol || null,
    ticker: symbol,
    isin: raw.isin || null,
    name: raw.description || raw.name || raw.contractDesc || contract.description || contract.localSymbol || symbol || null,
    quantity,
    price,
    currency: raw.currency || contract.currency || 'CHF',
    marketValue,
    avgCost: Number.isFinite(avgCost) ? avgCost : null,
    raw,
  };
}

function normaliseOrder(raw = {}) {
  const quantity = Number(raw.quantity ?? raw.size ?? raw.shares ?? 0);
  const filled = Number(raw.filled ?? raw.shares ?? 0);
  const avgFillPrice = numberOrNull(raw.avgFillPrice ?? raw.price);
  return {
    broker: 'interactive-brokers',
    orderId: raw.orderId || raw.id || null,
    permId: raw.permId || null,
    status: raw.status || null,
    action: raw.side || raw.action || null,
    identifier: raw.conid || raw.identifier || raw.symbol || null,
    symbol: raw.symbol || null,
    secType: raw.secType || null,
    quantity,
    filled,
    remaining: Number(raw.remaining ?? Math.max(quantity - filled, 0) ?? 0),
    limitPrice: numberOrNull(raw.limitPrice),
    stopPrice: numberOrNull(raw.stopPrice),
    avgFillPrice,
    lastFillPrice: numberOrNull(raw.lastFillPrice ?? raw.price),
    estimatedValue: Number(raw.estimatedValue ?? raw.amount ?? (Number.isFinite(avgFillPrice) ? avgFillPrice * filled : 0)),
    currency: raw.currency || 'CHF',
    transmit: raw.transmit === false ? false : true,
    executedAt: raw.executedAt || raw.time || null,
    execId: raw.execId || null,
    raw,
  };
}

function normaliseOrderQuote(raw = {}) {
  return {
    broker: 'interactive-brokers',
    ok: raw.ok !== false,
    identifier: raw.identifier || raw.conid || raw.symbol || null,
    symbol: raw.symbol || null,
    currency: raw.currency || 'CHF',
    action: raw.action || null,
    orderType: raw.orderType || null,
    quantity: Number(raw.quantity ?? 0),
    referencePrice: numberOrNull(raw.referencePrice),
    bid: numberOrNull(raw.bid),
    ask: numberOrNull(raw.ask),
    last: numberOrNull(raw.last),
    estimatedValue: numberOrNull(raw.estimatedValue),
    priceSource: raw.priceSource || null,
    warning: raw.warning || null,
    raw,
  };
}

function normaliseCancelResult(raw = {}) {
  return {
    broker: 'interactive-brokers',
    ok: raw.ok !== false,
    orderId: raw.orderId || null,
    status: raw.status || null,
    message: raw.message || null,
    raw,
  };
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

module.exports = { normaliseAccount, normaliseHolding, normaliseOrder, normaliseOrderQuote, normaliseCancelResult };
