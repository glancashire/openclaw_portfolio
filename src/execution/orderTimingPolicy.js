function normalizedUpper(value) {
  return String(value || '').trim().toUpperCase();
}

function applyExecutionTimingPolicy(order = {}, instrument = null) {
  const next = { ...order };
  const symbol = normalizedUpper(order?.symbol || instrument?.ibkrSymbol || '');
  const primaryExchange = normalizedUpper(order?.primaryExchange || instrument?.ibkrPrimaryExchange || '');

  if (!next.tif) next.tif = 'DAY';

  if (symbol === 'UBSPX' && primaryExchange === 'IBIS') {
    if (next.outsideRth == null) next.outsideRth = false;
    if (!next.goodAfterTime) next.goodAfterTime = '20260521 09:00:00 MET';
  }

  return next;
}

module.exports = { applyExecutionTimingPolicy };
