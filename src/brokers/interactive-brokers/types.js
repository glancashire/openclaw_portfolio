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
  const price = Number(raw.mktPrice ?? raw.price ?? raw.marketPrice ?? 0);
  const marketValue = Number(raw.mktValue ?? raw.marketValue ?? (Number.isFinite(price) ? price * quantity : 0));

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
    raw,
  };
}

function normaliseOrder(raw = {}) {
  return {
    broker: 'interactive-brokers',
    orderId: raw.orderId || raw.id || null,
    status: raw.status || null,
    action: raw.side || raw.action || null,
    identifier: raw.conid || raw.identifier || null,
    quantity: Number(raw.quantity ?? raw.size ?? 0),
    estimatedValue: Number(raw.estimatedValue ?? raw.amount ?? 0),
    currency: raw.currency || 'CHF',
    raw,
  };
}

module.exports = { normaliseAccount, normaliseHolding, normaliseOrder };
