'use strict';

/*
 * marketRuleResolver — authoritative IBKR tick-size resolution.
 *
 * Why this exists
 * ---------------
 * IBKR contracts advertise a flat `minTick`, but the *binding* constraint is the
 * exchange's price-tiered "market rule". A contract carries `marketRuleIds`
 * (comma-separated) positionally aligned with `validExchanges`. The increment for
 * a given price depends on which price band the price falls into for the rule that
 * governs the venue the order routes to.
 *
 * The June 2026 R2SC rejection happened because we trusted minTick=0.0005 while the
 * LSEETF venue's rule 983 enforces 0.01 above GBP 25. This module fixes that class
 * of bug for every instrument/venue by resolving the real rule table from IBKR,
 * caching it, and rounding limit prices to the band-correct increment.
 *
 * Resolution order for a (conid, venue, price):
 *   1. Disk cache (per ruleId) if fresh.
 *   2. Live IBKR reqMarketRule via the broker client.
 *   3. Static fallback tables (STATIC_MARKET_RULES) — known-verified rules.
 *   4. Coarse price-tier heuristic (conservative: rounds to the larger tick).
 *
 * All functions are defensive: a resolution failure never throws into the order
 * path; it falls back to a safe (coarser-or-equal) tick so a limit price is more
 * likely to be accepted, never finer than the venue allows.
 */

const fs = require('fs');
const path = require('path');

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // market rules are very stable; 30d
const DEFAULT_CACHE_DIR = path.join('runtime', 'broker-cache', 'market-rules');

/**
 * Known IBKR market rule increment tables (verified via reqMarketRule).
 * Used as a deterministic fallback when the live API is unavailable.
 * Sourced from live reqMarketRule responses; dates noted.
 */
const STATIC_MARKET_RULES = {
  // LSEETF / many GBP + EUR ETF venues. Verified 2026-06-15 (R2SC, conid 159310437).
  983: [
    { lowEdge: 0, increment: 0.0005 },
    { lowEdge: 0.1, increment: 0.001 },
    { lowEdge: 5, increment: 0.0025 },
    { lowEdge: 10, increment: 0.005 },
    { lowEdge: 25, increment: 0.01 },
  ],
  // Same tiered family as 983; verified 2026-06-15.
  3051: [
    { lowEdge: 0, increment: 0.0005 },
    { lowEdge: 0.1, increment: 0.001 },
    { lowEdge: 5, increment: 0.0025 },
    { lowEdge: 10, increment: 0.005 },
    { lowEdge: 25, increment: 0.01 },
  ],
  // IBIS2 / EBS / most European ETF venues. Verified 2026-05-29.
  1874: [
    { lowEdge: 0, increment: 0.0001 },
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
  ],
};

/**
 * Conservative coarse fallback used only when no rule table is resolvable at all.
 * Intentionally errs toward LARGER ticks at higher prices so a rounded limit is
 * accepted by the widest set of venues (never finer than a real venue allows).
 */
const COARSE_FALLBACK = [
  { lowEdge: 0, increment: 0.0005 },
  { lowEdge: 0.1, increment: 0.001 },
  { lowEdge: 5, increment: 0.005 },
  { lowEdge: 25, increment: 0.01 },
  { lowEdge: 100, increment: 0.02 },
  { lowEdge: 200, increment: 0.05 },
  { lowEdge: 500, increment: 0.1 },
  { lowEdge: 1000, increment: 0.5 },
];

function normalizeTable(table) {
  if (!Array.isArray(table)) return null;
  const rows = table
    .map((row) => ({ lowEdge: Number(row.lowEdge), increment: Number(row.increment) }))
    .filter((row) => Number.isFinite(row.lowEdge) && Number.isFinite(row.increment) && row.increment > 0)
    .sort((a, b) => a.lowEdge - b.lowEdge);
  return rows.length ? rows : null;
}

/** Increment for a price from a sorted increment table (walks down to the band). */
function incrementForPrice(table, price) {
  const rows = normalizeTable(table);
  if (!rows) return null;
  if (!Number.isFinite(price) || price <= 0) return rows[0].increment;
  let inc = rows[0].increment;
  for (const row of rows) {
    if (price >= row.lowEdge) inc = row.increment;
    else break;
  }
  return inc;
}

/**
 * Pair marketRuleIds with validExchanges positionally and return the ruleId that
 * governs the target venue. IBKR aligns these two comma lists by index.
 * Falls back to the first ruleId when the venue can't be matched.
 */
function ruleIdForVenue({ marketRuleIds, validExchanges, venue, primaryExchange } = {}) {
  const ids = String(marketRuleIds || '')
    .split(',')
    .map((s) => String(s).trim())
    .filter((s) => s !== '')
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n));
  if (!ids.length) return null;
  const exchanges = String(validExchanges || '')
    .split(',')
    .map((s) => String(s).trim().toUpperCase())
    .filter(Boolean);
  const targets = [venue, primaryExchange]
    .map((v) => String(v || '').trim().toUpperCase())
    .filter(Boolean);
  for (const target of targets) {
    const idx = exchanges.indexOf(target);
    if (idx >= 0 && idx < ids.length) return ids[idx];
  }
  // Common case: order routes SMART; prefer the SMART-aligned rule if present.
  const smartIdx = exchanges.indexOf('SMART');
  if (smartIdx >= 0 && smartIdx < ids.length) return ids[smartIdx];
  return ids[0];
}

function cachePathFor(cacheDir, ruleId) {
  return path.join(cacheDir, `rule-${ruleId}.json`);
}

function readCachedRule(cacheDir, ruleId, now = Date.now()) {
  try {
    const p = cachePathFor(cacheDir, ruleId);
    if (!fs.existsSync(p)) return null;
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!parsed || !Number.isFinite(Number(parsed.fetchedAt))) return null;
    if (now - Number(parsed.fetchedAt) > CACHE_TTL_MS) return null;
    return normalizeTable(parsed.table);
  } catch (_) {
    return null;
  }
}

function writeCachedRule(cacheDir, ruleId, table, now = Date.now()) {
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(
      cachePathFor(cacheDir, ruleId),
      JSON.stringify({ ruleId: Number(ruleId), fetchedAt: now, table }, null, 2)
    );
  } catch (_) { /* cache write is best-effort */ }
}

/**
 * Resolve the increment table for a single rule id, trying cache → live → static.
 * @param {object} opts
 * @param {number} opts.ruleId
 * @param {object} [opts.client] broker client exposing async fetchMarketRules([ids])
 * @param {string} [opts.cacheDir]
 * @param {number} [opts.now]
 * @returns {Promise<{ table: Array, source: string }>}
 */
async function resolveRuleTable({ ruleId, client, cacheDir = DEFAULT_CACHE_DIR, now = Date.now() }) {
  const id = Number(ruleId);
  if (!Number.isFinite(id)) return { table: null, source: 'none' };

  const cached = readCachedRule(cacheDir, id, now);
  if (cached) return { table: cached, source: 'cache' };

  if (client && typeof client.fetchMarketRules === 'function') {
    try {
      const map = await client.fetchMarketRules([id]);
      const live = normalizeTable(map && map[id]);
      if (live) {
        writeCachedRule(cacheDir, id, live, now);
        return { table: live, source: 'live' };
      }
    } catch (_) { /* fall through to static */ }
  }

  const stat = normalizeTable(STATIC_MARKET_RULES[id]);
  if (stat) return { table: stat, source: 'static' };

  return { table: null, source: 'none' };
}

/**
 * Resolve the binding tick size for a contract at a given price.
 * Never throws; returns a safe tick and the resolution source.
 *
 * @param {object} opts
 * @param {object} [opts.contractDetails] from fetchContractDetailsByConid (has marketRuleIds/validExchanges/minTick)
 * @param {number} opts.price reference price (ask or close)
 * @param {string} [opts.venue] target routing venue (e.g. 'LSEETF')
 * @param {object} [opts.client] broker client for live reqMarketRule
 * @param {string} [opts.cacheDir]
 * @param {number} [opts.now]
 * @returns {Promise<{ tick: number, ruleId: number|null, source: string, table: Array|null }>}
 */
async function resolveTick({ contractDetails, price, venue, client, cacheDir = DEFAULT_CACHE_DIR, now = Date.now() }) {
  const details = contractDetails || {};
  const ruleId = ruleIdForVenue({
    marketRuleIds: details.marketRuleIds,
    validExchanges: details.validExchanges,
    venue: venue || details.venue || details.primaryExchange,
    primaryExchange: details.primaryExchange || details.primaryExch,
  });

  if (Number.isFinite(ruleId)) {
    const { table, source } = await resolveRuleTable({ ruleId, client, cacheDir, now });
    const inc = incrementForPrice(table, price);
    if (Number.isFinite(inc) && inc > 0) {
      return { tick: inc, ruleId, source, table };
    }
  }

  // No rule resolvable. Prefer the contract's own minTick if it is at least as
  // coarse as the coarse-fallback band; otherwise use the conservative heuristic.
  const coarse = incrementForPrice(COARSE_FALLBACK, price);
  const minTick = Number(details.minTick);
  if (Number.isFinite(minTick) && minTick > 0) {
    // Use the COARSER of (minTick, coarse heuristic) so we never propose finer
    // than the venue is likely to accept.
    const tick = Math.max(minTick, coarse || minTick);
    return { tick, ruleId: Number.isFinite(ruleId) ? ruleId : null, source: 'mintick_or_coarse', table: null };
  }
  return { tick: coarse || 0.01, ruleId: Number.isFinite(ruleId) ? ruleId : null, source: 'coarse_fallback', table: null };
}

/**
 * Build a tickResolverFn suitable for generateBasketProposal / executeApprovedBasket.
 * Resolves the contract details once per conid (cached in-process for the run),
 * then resolves the band-correct tick for the given price+venue.
 *
 * Signature returned: async ({ conid, venue, currency, price }) => { tick, ruleId, source }
 *
 * @param {object} opts
 * @param {object} opts.client broker client with fetchContractDetailsByConid + fetchMarketRules
 * @param {string} [opts.cacheDir]
 */
function makeTickResolver({ client, cacheDir = DEFAULT_CACHE_DIR } = {}) {
  const detailsCache = new Map();
  return async function tickResolverFn({ conid, venue, price } = {}) {
    let contractDetails = null;
    const key = String(conid || '');
    if (key && client && typeof client.fetchContractDetailsByConid === 'function') {
      if (detailsCache.has(key)) {
        contractDetails = detailsCache.get(key);
      } else {
        try {
          contractDetails = await client.fetchContractDetailsByConid(Number(conid) || conid);
        } catch (_) { contractDetails = null; }
        detailsCache.set(key, contractDetails);
      }
    }
    return resolveTick({ contractDetails, price, venue, client, cacheDir });
  };
}

module.exports = {
  resolveTick,
  resolveRuleTable,
  ruleIdForVenue,
  incrementForPrice,
  normalizeTable,
  makeTickResolver,
  STATIC_MARKET_RULES,
  COARSE_FALLBACK,
  CACHE_TTL_MS,
  DEFAULT_CACHE_DIR,
  // test seams
  __readCachedRule: readCachedRule,
  __writeCachedRule: writeCachedRule,
};
