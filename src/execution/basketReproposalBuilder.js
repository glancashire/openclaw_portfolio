'use strict';

/* Phase 190 — Build a reproposal envelope for cancelled legs from a basket run.
 *
 * Pure functions where possible. The async builder accepts a `quoteFn(conid)` so
 * tests can stub broker access.
 */

const fs = require('fs');
const path = require('path');

function isSwissIsin(isin) {
  return typeof isin === 'string' && /^CH\d{10}$/.test(isin);
}

/** Round a price up to the nearest tick. SIX uses 0.05 CHF for many instruments;
 *  default to 0.01 elsewhere.
 */
function roundToTick(price, tick) {
  if (!Number.isFinite(price) || !Number.isFinite(tick) || tick <= 0) return price;
  const raw = Math.ceil((price - 1e-9) / tick) * tick;
  // Eliminate floating-point artifacts by rounding to the tick's decimal precision
  const decimals = Math.max(0, -Math.floor(Math.log10(tick) - 1e-9));
  return Number(raw.toFixed(decimals));
}

/** Decide a bumped limit price for a reproposal.
 *  - If an ask is available, use ask * 1.005 (50bps over ask).
 *  - Else use lastClose * 1.0075 (75bps over close).
 *  - Always strictly above the previous limit; if it isn't, raise to prevLimit * 1.005.
 *  - Round up to instrument tick.
 */
function computeBumpedLimitPrice({ ask, lastClose, previousLimit, tick }) {
  let raw = null;
  if (Number.isFinite(ask) && ask > 0) raw = ask * 1.005;
  else if (Number.isFinite(lastClose) && lastClose > 0) raw = lastClose * 1.0075;
  if (!Number.isFinite(raw)) raw = Number.isFinite(previousLimit) ? previousLimit * 1.005 : null;
  if (!Number.isFinite(raw)) return null;
  if (Number.isFinite(previousLimit) && raw <= previousLimit) {
    raw = previousLimit * 1.005;
  }
  const rounded = roundToTick(raw, tick || 0.01);
  // Final guard: must be strictly greater than previous limit
  if (Number.isFinite(previousLimit) && rounded <= previousLimit) {
    return roundToTick(previousLimit + (tick || 0.01), tick || 0.01);
  }
  return Number(rounded.toFixed(4));
}

/**
 * IBKR market rule 1874 price increments (covers IBIS2, EBS, and most European ETF venues).
 * Source: reqMarketRule(1874) — verified 2026-05-29.
 */
const MARKET_RULE_1874 = [
  { lowEdge: 0, increment: 0.0001 },
  { lowEdge: 0.1, increment: 0.0001 },
  { lowEdge: 0.2, increment: 0.0001 },
  { lowEdge: 0.5, increment: 0.0001 },
  { lowEdge: 1, increment: 0.0002 },
  { lowEdge: 2, increment: 0.0005 },
  { lowEdge: 5, increment: 0.001 },
  { lowEdge: 10, increment: 0.002 },
  { lowEdge: 20, increment: 0.005 },
  { lowEdge: 50, increment: 0.01 },
  { lowEdge: 100, increment: 0.02 },
  { lowEdge: 200, increment: 0.05 },
  { lowEdge: 500, increment: 0.1 },
  { lowEdge: 1000, increment: 0.2 },
  { lowEdge: 2000, increment: 0.5 },
  { lowEdge: 5000, increment: 1 },
  { lowEdge: 10000, increment: 2 },
  { lowEdge: 20000, increment: 5 },
  { lowEdge: 50000, increment: 10 },
];

/**
 * Look up the tick size for a given price using IBKR market rule 1874.
 * Walks the table in reverse to find the applicable price band.
 */
function tickForPrice(price) {
  if (!Number.isFinite(price) || price <= 0) return 0.01;
  for (let i = MARKET_RULE_1874.length - 1; i >= 0; i--) {
    if (price >= MARKET_RULE_1874[i].lowEdge) return MARKET_RULE_1874[i].increment;
  }
  return 0.0001;
}

/**
 * Pick the appropriate tick size for a leg.
 * @param {object} leg - Must include instrument, currency. Optionally price for price-aware lookup.
 * @param {number} [price] - Reference price for price-dependent tick lookup.
 */
function pickTick(leg, price) {
  // If a price is provided, use the IBKR market rule table (covers all European ETF venues)
  if (Number.isFinite(price) && price > 0) return tickForPrice(price);
  // Legacy fallback when no price is available
  if (isSwissIsin(leg.instrument)) return 0.05;
  if ((leg.currency || '').toUpperCase() === 'EUR') return 0.01;
  return 0.01;
}

function reproposalDir(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'basket-reproposals', portfolio);
}

function nextVersion(rootDir, portfolio, approvalId) {
  const dir = reproposalDir(rootDir, portfolio);
  if (!fs.existsSync(dir)) return 1;
  const re = new RegExp(`^${approvalId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-reproposal-(\\d+)\\.json$`);
  let max = 0;
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** Build a reproposal envelope for cancelled legs. Returns { path, envelope, version, skipped, excludedLegs }. */
async function buildReproposalForCancelledLegs({ portfolio, approvalId, runState, originalEnvelope, quoteFn, tickResolverFn, rootDir, now = new Date(), circuitBreakerThreshold = 3 }) {
  const cancelled = Object.values(runState.legs || {}).filter((leg) => leg.status === 'cancelled');
  if (cancelled.length === 0) return { skipped: true, reason: 'no_cancelled_legs' };

  // Phase 199: load the cancel-loop circuit breaker module lazily so existing tests
  // that stub `quoteFn` and don't touch breakers still work without filesystem state.
  let evaluateCircuitBreaker = null;
  try { ({ evaluateCircuitBreaker } = require('./cancelLoopBreaker')); } catch (_) { /* optional */ }

  const originalByLegId = new Map((originalEnvelope?.legs || []).map((l) => [l.legId, l]));

  const reproposalLegs = [];
  const excludedLegs = [];
  for (const leg of cancelled) {
    // Phase 199: if the instrument has tripped its circuit breaker, exclude it from reproposal.
    if (evaluateCircuitBreaker && rootDir && portfolio) {
      try {
        const evalResult = evaluateCircuitBreaker({
          portfolio,
          instrument: leg.instrument,
          latestApprovalId: approvalId,
          rootDir,
          threshold: circuitBreakerThreshold,
          now,
        });
        if (evalResult.tripped) {
          excludedLegs.push({
            legId: leg.legId,
            instrument: leg.instrument,
            reason: 'circuit_breaker_tripped',
            consecutiveCancellations: evalResult.count,
            threshold: evalResult.threshold,
            markerPath: evalResult.savedPath,
          });
          continue;
        }
      } catch (_) { /* breaker check is best-effort */ }
    }
    const orig = originalByLegId.get(leg.legId) || {};
    const conid = Number(orig.conid || leg.conid || 0);
    let quote = null;
    try { quote = quoteFn ? await quoteFn(conid) : null; } catch (error) { quote = { error: error.message }; }
    const ask = Number(quote?.ask);
    const lastClose = Number(quote?.lastClose ?? quote?.last ?? quote?.close);
    const previousLimit = Number(orig.limitPrice);
    const refPrice = Number.isFinite(ask) && ask > 0 ? ask : (Number.isFinite(lastClose) && lastClose > 0 ? lastClose : previousLimit);
    // Prefer the live/cached IBKR market-rule tick for this contract+venue+price.
    // Critical on the retry-after-cancel path: the bumped limit must land on the
    // venue's actual increment. Falls back to the static heuristic.
    let tick = pickTick({ instrument: leg.instrument, currency: orig.currency }, refPrice);
    if (typeof tickResolverFn === 'function') {
      try {
        const resolved = await tickResolverFn({
          conid: orig.conid || leg.conid,
          venue: orig.primaryExchange || orig.exchange,
          currency: orig.currency,
          price: refPrice,
        });
        const rt = Number(resolved && (resolved.tick != null ? resolved.tick : resolved));
        if (Number.isFinite(rt) && rt > 0) tick = rt;
      } catch (_) { /* keep heuristic tick */ }
    }
    const bumped = computeBumpedLimitPrice({ ask, lastClose, previousLimit, tick });
    if (!Number.isFinite(bumped)) {
      reproposalLegs.push({ ...orig, status: 'needs_manual_review', reason: 'no_quote_available' });
      continue;
    }
    reproposalLegs.push({
      ...orig,
      legId: orig.legId || leg.legId,
      instrument: leg.instrument,
      ibkrSymbol: orig.ibkrSymbol || leg.ibkrSymbol,
      conid: orig.conid || leg.conid,
      action: orig.action || 'BUY',
      quantity: orig.quantity || 0,
      limitPrice: bumped,
      currency: orig.currency,
      exchange: orig.exchange || 'SMART',
      primaryExchange: orig.primaryExchange,
      maxAttempts: 1,
      retryPolicy: 'none',
      allowSubstitution: false,
      status: 'pending_user_approval',
      reason: `Reproposal: previous limit ${previousLimit} cancelled; new limit ${bumped} based on ${Number.isFinite(ask) ? `ask ${ask}` : `close ${lastClose}`}.`,
      previousLimit,
      quoteAsk: Number.isFinite(ask) ? ask : null,
      quoteLastClose: Number.isFinite(lastClose) ? lastClose : null,
    });
  }

  if (reproposalLegs.length === 0) {
    return { skipped: true, reason: 'all_legs_circuit_broken', excludedLegs };
  }

  const version = nextVersion(rootDir, portfolio, approvalId);
  const envelope = {
    schemaVersion: '1.0',
    portfolio,
    approvalId: `${approvalId}-reproposal-${version}`,
    parentApprovalId: approvalId,
    reproposalVersion: version,
    createdAt: (typeof now === 'string' ? now : now.toISOString()),
    expiresAt: new Date((typeof now === 'string' ? Date.parse(now) : now.getTime()) + 4 * 60 * 60 * 1000).toISOString(),
    status: 'pending_user_approval',
    legs: reproposalLegs,
  };

  const dir = reproposalDir(rootDir, portfolio);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `${approvalId}-reproposal-${version}.json`);
  fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2));

  // Phase 194: archive superseded reproposals so the operator surface stays clean.
  let archived = [];
  try {
    const { sweepSupersededReproposals } = require('./basketReproposalArchiver');
    const sweep = sweepSupersededReproposals({ rootDir, portfolio });
    archived = sweep.archived || [];
  } catch (_) { /* archiver optional */ }

  return { path: outPath, envelope, version, skipped: false, archived, excludedLegs };
}

module.exports = {
  buildReproposalForCancelledLegs,
  computeBumpedLimitPrice,
  roundToTick,
  isSwissIsin,
  pickTick,
  tickForPrice,
  MARKET_RULE_1874,
};
