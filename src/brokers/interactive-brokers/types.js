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
  return {
    broker: 'interactive-brokers',
    identifier: raw.conid || raw.isin || raw.symbol || null,
    ticker: raw.symbol || null,
    isin: raw.isin || null,
    name: raw.description || raw.name || raw.contractDesc || null,
    quantity: Number(raw.position ?? raw.quantity ?? 0),
    price: Number(raw.mktPrice ?? raw.price ?? 0),
    currency: raw.currency || 'CHF',
    marketValue: Number(raw.mktValue ?? raw.marketValue ?? 0),
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
