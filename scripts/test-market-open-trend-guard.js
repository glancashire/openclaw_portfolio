'use strict';

const {
  analyzeQuoteTrend,
  shouldBlockForTrend,
  calculateSmartLimit,
} = require('./submit-orders-at-open');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const surgeQuote = { bid: 102, ask: 103, last: 103, close: 99 };
  const surgeTrend = analyzeQuoteTrend(surgeQuote);
  assert(surgeTrend.ok, 'expected surge trend to be analyzable');
  assert(surgeTrend.trend === 'up', `expected up trend, got ${surgeTrend.trend}`);
  assert(surgeTrend.movePct > 3, `expected >3% move, got ${surgeTrend.movePct}`);

  let decision = shouldBlockForTrend({
    action: 'BUY',
    trendInfo: surgeTrend,
    marketEntryPolicy: { avoidBuyingAfterExtremeDailyMoves: true },
  });
  assert(decision.block === true, 'expected BUY to be blocked on extreme positive move');
  assert(/extreme daily move guard/i.test(decision.reason), 'expected explicit guard reason');

  decision = shouldBlockForTrend({
    action: 'SELL',
    trendInfo: surgeTrend,
    marketEntryPolicy: { avoidBuyingAfterExtremeDailyMoves: true },
  });
  assert(decision.block === false, 'expected SELL not to be blocked by buy-only trend guard');

  const mildQuote = { bid: 100.1, ask: 100.2, last: 100.15, close: 100 };
  const mildTrend = analyzeQuoteTrend(mildQuote);
  decision = shouldBlockForTrend({
    action: 'BUY',
    trendInfo: mildTrend,
    marketEntryPolicy: { avoidBuyingAfterExtremeDailyMoves: true },
  });
  assert(decision.block === false, 'expected mild move BUY not to be blocked');

  const delayedOnlyQuote = { bid: null, ask: null, last: null, close: 100 };
  const delayedLimit = calculateSmartLimit(delayedOnlyQuote, 'BUY');
  assert(Number.isFinite(delayedLimit) && delayedLimit > 100, `expected delayed close fallback limit, got ${delayedLimit}`);

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
