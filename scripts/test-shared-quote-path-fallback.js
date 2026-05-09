'use strict';

const { calculateSmartLimit, analyzeQuoteTrend } = require('./submit-orders-at-open');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const sharedFallbackQuote = {
    ok: true,
    conid: 1001,
    bid: null,
    ask: null,
    last: null,
    close: 100,
    currency: 'CHF',
  };

  const limit = calculateSmartLimit(sharedFallbackQuote, 'BUY');
  assert(Number.isFinite(limit), 'expected smart limit from delayed close fallback');
  assert(limit > 100, `expected buffered buy limit above close, got ${limit}`);

  const trend = analyzeQuoteTrend(sharedFallbackQuote);
  assert(trend.ok === false, 'expected trend to remain unavailable without live reference price');

  console.log(JSON.stringify({ ok: true, limit, trend }, null, 2));
}

main();
