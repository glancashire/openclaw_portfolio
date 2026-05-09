'use strict';

const { evaluateMarketOpenBlock } = require('../src/execution/marketOpenPolicy');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const buyTrade = { action: 'BUY' };
  const policy = { avoidBuyingAfterExtremeDailyMoves: true };

  const noQuote = evaluateMarketOpenBlock({ trade: buyTrade, quote: null, marketEntryPolicy: policy });
  assert(noQuote.blocked === true, 'expected no-quote case to block');
  assert(noQuote.blockCode === 'quote_unavailable', `unexpected block code: ${noQuote.blockCode}`);

  const surgeQuote = { close: 100, last: 104, bid: 103.5, ask: 104.2 };
  const surge = evaluateMarketOpenBlock({ trade: buyTrade, quote: surgeQuote, marketEntryPolicy: policy });
  assert(surge.blocked === true, 'expected surge case to block');
  assert(surge.blockCode === 'trend_guard_blocked', `unexpected surge code: ${surge.blockCode}`);

  const fallbackQuote = { close: 100, last: null, bid: null, ask: null };
  const fallback = evaluateMarketOpenBlock({ trade: buyTrade, quote: fallbackQuote, marketEntryPolicy: policy });
  assert(fallback.blocked === false, 'expected delayed-close fallback to stay executable');
  assert(Number.isFinite(fallback.limitPrice), 'expected fallback limit price');

  const unusableQuote = { close: null, last: null, bid: null, ask: null };
  const unusable = evaluateMarketOpenBlock({ trade: buyTrade, quote: unusableQuote, marketEntryPolicy: policy });
  assert(unusable.blocked === true, 'expected unusable quote to block');
  assert(unusable.blockCode === 'limit_price_unavailable', `unexpected unusable code: ${unusable.blockCode}`);

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
