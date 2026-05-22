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
  return Math.ceil((price - 1e-9) / tick) * tick;
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

function pickTick(leg) {
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
  const re = new RegExp(`^${approvalId.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}-reproposal-(\\d+)\\.json$`);
  let max = 0;
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

/** Build a reproposal envelope for cancelled legs. Returns { path, envelope, version, skipped }. */
async function buildReproposalForCancelledLegs({ portfolio, approvalId, runState, originalEnvelope, quoteFn, rootDir, now = new Date() }) {
  const cancelled = Object.values(runState.legs || {}).filter((leg) => leg.status === 'cancelled');
  if (cancelled.length === 0) return { skipped: true, reason: 'no_cancelled_legs' };

  const originalByLegId = new Map((originalEnvelope?.legs || []).map((l) => [l.legId, l]));

  const reproposalLegs = [];
  for (const leg of cancelled) {
    const orig = originalByLegId.get(leg.legId) || {};
    const conid = Number(orig.conid || leg.conid || 0);
    let quote = null;
    try { quote = quoteFn ? await quoteFn(conid) : null; } catch (error) { quote = { error: error.message }; }
    const ask = Number(quote?.ask);
    const lastClose = Number(quote?.lastClose ?? quote?.last ?? quote?.close);
    const tick = pickTick({ instrument: leg.instrument, currency: orig.currency });
    const previousLimit = Number(orig.limitPrice);
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

  const version = nextVersion(rootDir, portfolio, approvalId);
  const envelope = {
    schemaVersion: '1.0',
    portfolio,
    approvalId: `${approvalId}-reproposal-${version}`,
    parentApprovalId: approvalId,
    reproposalVersion: version,
    createdAt: (typeof now === 'string' ? now : now.toISOString()),
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

  return { path: outPath, envelope, version, skipped: false, archived };
}

module.exports = {
  buildReproposalForCancelledLegs,
  computeBumpedLimitPrice,
  roundToTick,
  isSwissIsin,
  pickTick,
};
