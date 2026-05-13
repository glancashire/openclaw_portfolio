'use strict';

function tickSizeFor({ currency, referencePrice }) {
  const ccy = String(currency || '').toUpperCase();
  const px = Number(referencePrice || 0);
  if (ccy === 'CHF') {
    if (px >= 100) return 0.05;
    if (px >= 1) return 0.01;
    return 0.001;
  }
  if (ccy === 'EUR' || ccy === 'USD' || ccy === 'GBP') {
    if (px >= 1) return 0.01;
    return 0.001;
  }
  return 0.01;
}

function snapToTick(price, tickSize, action) {
  const value = Number(price || 0);
  const tick = Number(tickSize || 0);
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(tick) || tick <= 0) return null;
  const units = value / tick;
  const snappedUnits = String(action || '').toUpperCase() === 'SELL' ? Math.floor(units + 1e-9) : Math.ceil(units - 1e-9);
  return Number((snappedUnits * tick).toFixed(6));
}

function calculateSmartLimit(quote, action, options = {}) {
  if (quote?.bid && quote?.ask && quote.bid > 0 && quote.ask > 0) {
    const raw = action === 'BUY' ? Number(quote.ask) : Number(quote.bid);
    const tick = tickSizeFor({ currency: options.currency || quote.currency, referencePrice: raw });
    return snapToTick(raw, tick, action);
  }
  const ref = quote?.last || quote?.close;
  if (!ref) return null;
  const buffer = action === 'BUY' ? 1.003 : 0.997;
  const raw = Number(ref) * buffer;
  const tick = tickSizeFor({ currency: options.currency || quote.currency, referencePrice: raw });
  return snapToTick(raw, tick, action);
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

  const limitPrice = calculateSmartLimit(quote, trade?.action, { currency: trade?.currency });
  if (!limitPrice) {
    const hasAnyClose = Number.isFinite(Number(quote?.close)) && Number(quote?.close) > 0;
    const hasAnyReference = Number.isFinite(Number(quote?.last)) && Number(quote?.last) > 0
      || Number.isFinite(Number(quote?.ask)) && Number(quote?.ask) > 0
      || Number.isFinite(Number(quote?.bid)) && Number(quote?.bid) > 0;
    const pricingPostureReason = !hasAnyClose && !hasAnyReference
      ? 'Broker returned quote data, but no usable live or delayed reference price fields were available for safe smart-limit construction.'
      : 'Could not determine a smart limit price from broker quote data.';
    return {
      blocked: true,
      blockCode: !hasAnyClose && !hasAnyReference ? 'pricing_reference_unavailable' : 'limit_price_unavailable',
      blockReason: pricingPostureReason,
      nextAction: !hasAnyClose && !hasAnyReference
        ? 'Wait for a usable live/delayed reference price snapshot or restore the required market-data entitlement, then retry.'
        : 'Inspect broker quote fields and retry when a usable reference price is available.',
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
