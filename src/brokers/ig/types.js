function normaliseAccount(raw = {}) {
  return {
    broker: 'ig',
    accountId: raw.accountId || raw.id || null,
    accountName: raw.accountName || raw.name || null,
    accountType: raw.accountType || raw.type || null,
    currency: raw.currency || null,
    status: raw.status || null,
    raw,
  };
}

function normaliseCashBalance(raw = {}) {
  return {
    currency: raw.currency || 'CHF',
    amount: Number(raw.amount ?? raw.balance ?? 0),
    available: Number(raw.available ?? raw.availableToDeal ?? raw.balance ?? 0),
    raw,
  };
}

function normaliseHolding(raw = {}) {
  return {
    broker: 'ig',
    identifier: raw.isin || raw.ticker || raw.epic || null,
    ticker: raw.ticker || raw.symbol || null,
    isin: raw.isin || null,
    name: raw.name || raw.instrumentName || null,
    quantity: Number(raw.quantity ?? raw.size ?? 0),
    price: Number(raw.price ?? raw.bid ?? raw.offer ?? 0),
    currency: raw.currency || 'CHF',
    marketValue: Number(raw.marketValue ?? raw.value ?? 0),
    raw,
  };
}

function normaliseInstrument(raw = {}) {
  return {
    broker: 'ig',
    identifier: raw.isin || raw.epic || raw.ticker || null,
    ticker: raw.ticker || raw.symbol || null,
    isin: raw.isin || null,
    name: raw.name || raw.instrumentName || null,
    exchange: raw.exchange || raw.market || null,
    currency: raw.currency || null,
    instrumentType: raw.instrumentType || raw.type || null,
    raw,
  };
}

function normalisePrice(raw = {}) {
  return {
    identifier: raw.identifier || raw.epic || raw.isin || null,
    price: Number(raw.price ?? raw.mid ?? raw.bid ?? raw.offer ?? 0),
    bid: raw.bid != null ? Number(raw.bid) : null,
    ask: raw.offer != null ? Number(raw.offer) : null,
    currency: raw.currency || 'CHF',
    asOf: raw.asOf || new Date().toISOString(),
    raw,
  };
}

function normaliseOrder(raw = {}) {
  return {
    broker: 'ig',
    orderId: raw.orderId || raw.dealId || null,
    status: raw.status || raw.dealStatus || null,
    action: raw.action || raw.direction || null,
    identifier: raw.identifier || raw.epic || raw.isin || null,
    quantity: Number(raw.quantity ?? raw.size ?? 0),
    estimatedValue: Number(raw.estimatedValue ?? raw.value ?? 0),
    currency: raw.currency || 'CHF',
    raw,
  };
}

module.exports = {
  normaliseAccount,
  normaliseCashBalance,
  normaliseHolding,
  normaliseInstrument,
  normalisePrice,
  normaliseOrder,
};
