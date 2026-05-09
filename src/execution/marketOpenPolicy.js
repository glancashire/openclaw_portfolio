'use strict';

function calculateSmartLimit(quote, action) {
  if (quote?.bid && quote?.ask && quote.bid > 0 && quote.ask > 0) {
    if (action === 'BUY') return Math.round(quote.ask * 10000) / 10000;
    return Math.round(quote.bid * 10000) / 10000;
  }
  const ref = quote?.last || quote?.close;
  if (!ref) return null;
  const buffer = action === 'BUY' ? 1.003 : 0.997;
  return Math.round(ref * buffer * 10000) / 10000;
}

function analyzeQuoteTrend(quote) {
  const close = Number(quote?.close);
  const last = Number(quote?.last);
  const bid = Number(quote?.bid);
  const ask = Number(quote?.ask);
  const reference = Number.isFinite(last) && last > 0
    ? last
    : Number.isFinite(ask) && ask > 0
      ? ask
      : Number.isFinite(bid) && bid > 0
        ? bid
        : null;
  if (!Number.isFinite(close) || close <= 0 || !Number.isFinite(reference) || reference <= 0) {
    return { ok: false, trend: 'unknown', movePct: null, referencePrice: reference, closePrice: Number.isFinite(close) ? close : null };
  }
  const movePct = Number((((reference - close) / close) * 100).toFixed(2));
  return {
    ok: true,
    trend: movePct >= 1 ? 'up' : movePct <= -1 ? 'down' : 'flat',
    movePct,
    referencePrice: reference,
    closePrice: close,
  };
}

function shouldBlockForTrend({ action, trendInfo, marketEntryPolicy, extremeMovePct = 3 }) {
  if (String(action || '').toUpperCase() !== 'BUY') return { block: false, reason: null };
  if (!marketEntryPolicy?.avoidBuyingAfterExtremeDailyMoves) return { block: false, reason: null };
  if (!trendInfo?.ok) return { block: false, reason: null };
  if (Number(trendInfo.movePct) >= extremeMovePct) {
    return {
      block: true,
      reason: `Buy skipped because price is up ${trendInfo.movePct}% versus prior close, breaching the extreme daily move guard (${extremeMovePct}%).`,
    };
  }
  return { block: false, reason: null };
}

function evaluateMarketOpenBlock({ trade, quote, marketEntryPolicy }) {
  if (!quote) {
    return {
      blocked: true,
      blockCode: 'quote_unavailable',
      blockReason: 'No broker quote was available during market-open execution.',
      nextAction: 'Restore broker pricing and rerun the market-open submission path.',
      trendInfo: { ok: false, trend: 'unknown', movePct: null, referencePrice: null, closePrice: null },
      limitPrice: null,
    };
  }

  const trendInfo = analyzeQuoteTrend(quote);
  const trendDecision = shouldBlockForTrend({ action: trade?.action, trendInfo, marketEntryPolicy });
  if (trendDecision.block) {
    return {
      blocked: true,
      blockCode: 'trend_guard_blocked',
      blockReason: trendDecision.reason,
      nextAction: 'Review price action after the open and re-approve or reschedule if the move normalizes.',
      trendInfo,
      limitPrice: null,
    };
  }

  const limitPrice = calculateSmartLimit(quote, trade?.action);
  if (!limitPrice) {
    return {
      blocked: true,
      blockCode: 'limit_price_unavailable',
      blockReason: 'Could not determine a smart limit price from broker quote data.',
      nextAction: 'Inspect broker quote fields and retry when a usable reference price is available.',
      trendInfo,
      limitPrice: null,
    };
  }

  return {
    blocked: false,
    blockCode: null,
    blockReason: null,
    nextAction: null,
    trendInfo,
    limitPrice,
  };
}

module.exports = {
  calculateSmartLimit,
  analyzeQuoteTrend,
  shouldBlockForTrend,
  evaluateMarketOpenBlock,
};
