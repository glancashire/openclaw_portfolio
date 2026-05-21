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
  const hasExplicitPrice = Number.isFinite(explicitPrice) && explicitPrice > 0;
  const hasAvgCost = Number.isFinite(avgCost) && avgCost > 0;
  const price = hasExplicitPrice
    ? explicitPrice
    : (hasAvgCost ? avgCost : 0);
  const explicitMarketValue = Number(raw.mktValue ?? raw.marketValue);
  const hasExplicitMarketValue = Number.isFinite(explicitMarketValue) && explicitMarketValue > 0;
  const marketValue = hasExplicitMarketValue
    ? explicitMarketValue
    : (Number.isFinite(price) ? price * quantity : 0);
  const isin = raw.isin || contract.isin || null;
  const localSymbol = raw.localSymbol || contract.localSymbol || null;
  const primaryExchange = raw.primaryExchange || raw.primaryExch || contract.primaryExchange || contract.primaryExch || null;
  const exchange = raw.exchange || contract.exchange || null;
  const priceBasis = hasExplicitPrice
    ? 'market_snapshot'
    : (hasAvgCost ? 'avg_cost_fallback' : 'unknown');
  const marketValueBasis = hasExplicitMarketValue
    ? 'broker_market_value'
    : ((priceBasis === 'market_snapshot' || priceBasis === 'avg_cost_fallback') ? `${priceBasis}_times_quantity` : 'unknown');

  return {
    broker: 'interactive-brokers',
    identifier: conid || isin || symbol || localSymbol || null,
    ticker: symbol,
    isin,
    localSymbol,
    primaryExchange,
    exchange,
    name: raw.description || raw.name || raw.contractDesc || contract.description || localSymbol || symbol || null,
    quantity,
    price,
    priceBasis,
    currency: raw.currency || contract.currency || 'CHF',
    marketValue,
    marketValueBasis,
    avgCost: hasAvgCost ? avgCost : null,
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
    brokerReason: raw.brokerReason || null,
    brokerErrorCode: raw.brokerErrorCode ?? null,
    brokerErrorMessage: raw.brokerErrorMessage || null,
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
