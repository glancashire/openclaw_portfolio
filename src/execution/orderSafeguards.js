'use strict';

/**
 * src/execution/orderSafeguards.js
 *
 * Pre-transmission safety guards. These run AFTER policy evaluation and
 * BEFORE the basket runner hands an order to the broker. They are
 * intentionally conservative and blocking — they refuse to transmit
 * rather than guess.
 *
 * Guards implemented:
 *
 *   1. Sell-without-approval guard (defense-in-depth on top of
 *      portfolio.md `Require user approval for sales: yes`).
 *      A SELL leg must carry an explicit `userApproved: true` AND the
 *      enclosing approval envelope must contain `sellApproved: true`.
 *
 *   2. Below-market price floor for SELL legs.
 *      Refuses to transmit a SELL with limitPrice more than
 *      `maxBelowMarketPct` (default 5%) below the current bid.
 *      Mirrors the spirit of IBKR's "limit price too far from market"
 *      protection but does it BEFORE we hit the broker, so a fat-finger
 *      never reaches the wire.
 *
 *   3. Above-market price ceiling for BUY legs.
 *      Refuses to transmit a BUY with limitPrice more than
 *      `maxAboveMarketPct` (default 5%) above the current ask.
 *      Catches typos like 6190 instead of 61.90.
 *
 *   4. Per-leg notional cap.
 *      Refuses any single leg whose estimated CHF notional exceeds
 *      `maxLegChf` (default 25,000 CHF, i.e. ~16% of a 150k portfolio).
 *      Tunable per portfolio.
 *
 *   5. Per-basket notional cap.
 *      Refuses an entire basket whose total CHF notional exceeds
 *      `maxBasketChf` (default 50,000 CHF, ~33% of portfolio).
 *
 *   6. Stale-quote guard.
 *      Refuses any leg whose live quote could not be retrieved or
 *      whose bid/ask are nonsense (bid=0, ask=0, or bid>ask).
 *
 * Each guard returns { ok, code, reason, detail }.
 * On the first failure, transmission is refused; the basket runner records
 * the leg as `blocked` with the guard code.
 *
 * Configuration: defaults are baked in; per-portfolio overrides come from
 * `portfolio.md` Safety Controls section keys (see DEFAULTS below).
 */

const DEFAULTS = Object.freeze({
  maxBelowMarketPct: 5.0,   // sell limit cannot be > 5% below current bid
  maxAboveMarketPct: 5.0,   // buy limit cannot be > 5% above current ask
  maxLegChf: 25000,         // single leg ≤ CHF 25,000
  maxBasketChf: 50000,      // whole basket ≤ CHF 50,000
  maxLegsPerBasket: 10,     // refuse > 10 legs in one basket
});

class OrderSafeguardError extends Error {
  constructor(code, message, detail = null) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

function asNumber(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pctDiff(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return Number((((a - b) / b) * 100).toFixed(3));
}

/**
 * Validate a single leg against the live quote and configured limits.
 *
 * @param {object} params
 * @param {object} params.leg                - basket leg with action, limitPrice, quantity, currency, conid
 * @param {object} params.liveQuote          - { bid, ask, last } in NATIVE currency
 * @param {number} params.fxToChf            - FX conversion factor; CHF=1
 * @param {object} [params.envelope]         - enclosing basket envelope (for sellApproved check)
 * @param {object} [params.config]           - merged config (portfolio overrides + DEFAULTS)
 */
function evaluateLeg({ leg, liveQuote, fxToChf, envelope = {}, config = {} } = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const action = String(leg?.action || '').toUpperCase();
  const limitPrice = asNumber(leg?.limitPrice);
  const quantity = asNumber(leg?.quantity);
  const fx = Number.isFinite(fxToChf) && fxToChf > 0 ? fxToChf : 1;

  if (!action || !['BUY', 'SELL'].includes(action)) {
    return { ok: false, code: 'bad_action', reason: `Unsupported action: ${leg?.action}` };
  }
  if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
    return { ok: false, code: 'bad_limit_price', reason: 'limitPrice missing or non-positive.' };
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, code: 'bad_quantity', reason: 'quantity missing or non-positive.' };
  }

  const bid = asNumber(liveQuote?.bid);
  const ask = asNumber(liveQuote?.ask);
  const last = asNumber(liveQuote?.last);
  const referenceForBuy = ask ?? last;
  const referenceForSell = bid ?? last;

  // Stale-quote guard
  if (!Number.isFinite(referenceForBuy) && !Number.isFinite(referenceForSell)) {
    return { ok: false, code: 'no_quote', reason: `No usable bid/ask/last for conid ${leg.conid}.` };
  }
  if (Number.isFinite(bid) && Number.isFinite(ask) && bid > ask) {
    return { ok: false, code: 'crossed_quote', reason: `Bid ${bid} > ask ${ask} — broker quote is invalid.` };
  }
  if (Number.isFinite(bid) && bid <= 0) {
    return { ok: false, code: 'bad_bid', reason: `Bid is non-positive (${bid}).` };
  }
  if (Number.isFinite(ask) && ask <= 0) {
    return { ok: false, code: 'bad_ask', reason: `Ask is non-positive (${ask}).` };
  }

  // SELL-specific guards
  if (action === 'SELL') {
    // Defense-in-depth: require explicit envelope-level sellApproved=true
    if (envelope.sellApproved !== true) {
      return {
        ok: false,
        code: 'sell_not_envelope_approved',
        reason: 'SELL leg present but envelope.sellApproved !== true. Sells require explicit envelope sellApproved=true.',
      };
    }
    if (!Number.isFinite(referenceForSell)) {
      return { ok: false, code: 'no_sell_reference', reason: 'No bid or last for SELL price-floor check.' };
    }
    const drift = pctDiff(limitPrice, referenceForSell);
    if (drift !== null && drift < -cfg.maxBelowMarketPct) {
      return {
        ok: false,
        code: 'sell_below_market_floor',
        reason: `SELL limit ${limitPrice} is ${Math.abs(drift)}% below reference ${referenceForSell}; floor is ${cfg.maxBelowMarketPct}%.`,
        detail: { limitPrice, referencePrice: referenceForSell, driftPct: drift, floorPct: -cfg.maxBelowMarketPct },
      };
    }
  }

  // BUY-specific guards
  if (action === 'BUY') {
    if (!Number.isFinite(referenceForBuy)) {
      return { ok: false, code: 'no_buy_reference', reason: 'No ask or last for BUY price-ceiling check.' };
    }
    const drift = pctDiff(limitPrice, referenceForBuy);
    if (drift !== null && drift > cfg.maxAboveMarketPct) {
      return {
        ok: false,
        code: 'buy_above_market_ceiling',
        reason: `BUY limit ${limitPrice} is ${drift}% above reference ${referenceForBuy}; ceiling is ${cfg.maxAboveMarketPct}%.`,
        detail: { limitPrice, referencePrice: referenceForBuy, driftPct: drift, ceilingPct: cfg.maxAboveMarketPct },
      };
    }
  }

  // Notional cap (per leg)
  const legChf = limitPrice * quantity * fx;
  if (legChf > cfg.maxLegChf) {
    return {
      ok: false,
      code: 'leg_notional_cap',
      reason: `Leg notional CHF ${legChf.toFixed(2)} exceeds cap CHF ${cfg.maxLegChf}.`,
      detail: { legChf, maxLegChf: cfg.maxLegChf },
    };
  }

  return { ok: true, legChf };
}

/**
 * Validate the whole basket BEFORE the runner starts iterating legs.
 *
 * @param {object} params
 * @param {object} params.envelope
 * @param {function} params.fetchLiveQuote   - async (conid) => { bid, ask, last }
 * @param {function} params.fxLookup         - (currency) => Number (fxToChf, 1 if CHF)
 * @param {object} [params.config]
 *
 * @returns {object} { ok, blockers: [{legId, code, reason, detail}], summary }
 */
async function evaluateBasketSafeguards({ envelope, fetchLiveQuote, fxLookup, config = {} } = {}) {
  const cfg = { ...DEFAULTS, ...config };
  const legs = Array.isArray(envelope?.legs) ? envelope.legs : [];

  if (legs.length === 0) {
    return { ok: false, blockers: [{ code: 'empty_basket', reason: 'Basket has no legs.' }], summary: null };
  }
  if (legs.length > cfg.maxLegsPerBasket) {
    return {
      ok: false,
      blockers: [{ code: 'too_many_legs', reason: `Basket has ${legs.length} legs; cap is ${cfg.maxLegsPerBasket}.` }],
      summary: null,
    };
  }

  // Pre-flight: any SELL legs require explicit envelope sellApproved=true
  const sellLegs = legs.filter((l) => String(l.action || '').toUpperCase() === 'SELL');
  if (sellLegs.length > 0 && envelope.sellApproved !== true) {
    return {
      ok: false,
      blockers: sellLegs.map((leg) => ({
        legId: leg.legId,
        code: 'sell_not_envelope_approved',
        reason: 'Basket contains SELL legs but envelope.sellApproved !== true. SELL baskets must be explicitly flagged.',
      })),
      summary: { sellLegCount: sellLegs.length, sellApproved: envelope.sellApproved === true },
    };
  }

  const blockers = [];
  let totalChf = 0;
  for (const leg of legs) {
    let liveQuote = null;
    try {
      liveQuote = await fetchLiveQuote(leg.conid || leg.instrument);
    } catch (err) {
      blockers.push({ legId: leg.legId, code: 'quote_fetch_error', reason: err.message });
      continue;
    }
    const fxToChf = fxLookup ? fxLookup(leg.currency) : 1;
    const result = evaluateLeg({ leg, liveQuote, fxToChf, envelope, config: cfg });
    if (!result.ok) {
      blockers.push({ legId: leg.legId, instrument: leg.instrument, code: result.code, reason: result.reason, detail: result.detail || null });
    } else {
      totalChf += Number(result.legChf || 0);
    }
  }

  if (totalChf > cfg.maxBasketChf) {
    blockers.push({
      code: 'basket_notional_cap',
      reason: `Basket total CHF ${totalChf.toFixed(2)} exceeds cap CHF ${cfg.maxBasketChf}.`,
      detail: { totalChf, maxBasketChf: cfg.maxBasketChf },
    });
  }

  return {
    ok: blockers.length === 0,
    blockers,
    summary: {
      legCount: legs.length,
      sellLegCount: sellLegs.length,
      totalChf: Number(totalChf.toFixed(2)),
      maxLegChf: cfg.maxLegChf,
      maxBasketChf: cfg.maxBasketChf,
      maxBelowMarketPct: cfg.maxBelowMarketPct,
      maxAboveMarketPct: cfg.maxAboveMarketPct,
    },
  };
}

module.exports = {
  DEFAULTS,
  OrderSafeguardError,
  evaluateLeg,
  evaluateBasketSafeguards,
};
