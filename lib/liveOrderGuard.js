'use strict';

/**
 * lib/liveOrderGuard.js
 *
 * Two small utilities that together close the duplicate-fill class of bug
 * we hit on 2026-05-26 when an ad-hoc re-pricer script was re-invoked "to
 * view output" and silently transmitted the same order twice.
 *
 *   1. requireExplicitLiveOrderIntent() — call from any one-shot script
 *      that places live orders. Throws unless the operator has set
 *      OPENCLAW_PLACE_LIVE_ORDER=1 in the env. Intended for human-driven
 *      ad-hoc invocations; not used by the regular basket runner.
 *
 *   2. withIdempotencyKey({ key, ledgerPath, fn }) — wraps any side-
 *      effecting async function. If a prior invocation with the same key
 *      already succeeded within the retention window, returns the recorded
 *      outcome and DOES NOT call fn. Otherwise calls fn, records the
 *      outcome on disk, and returns it.
 *
 * The ledger is a flat JSON file (default: runtime/idempotency-ledger.json)
 * with the shape { entries: [{ key, ts, outcome }, ...] }. It self-prunes
 * entries older than retentionMs on every write.
 *
 * Both helpers are pure / synchronous on the env, and async on disk I/O.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_LEDGER_PATH = 'runtime/idempotency-ledger.json';
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000; // 24h

class ExplicitLiveOrderIntentRequiredError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExplicitLiveOrderIntentRequiredError';
    this.code = 'OPENCLAW_PLACE_LIVE_ORDER_REQUIRED';
  }
}

/**
 * Throws ExplicitLiveOrderIntentRequiredError unless the env has
 * OPENCLAW_PLACE_LIVE_ORDER=1. Returns true on success so callers can
 * `if (requireExplicitLiveOrderIntent()) { ... }` defensively.
 *
 * Accepted truthy values: '1' (the only one). Anything else fails closed —
 * including 'true', 'yes', '0', '', or undefined.
 */
function requireExplicitLiveOrderIntent({ env = process.env, scriptName = null } = {}) {
  const v = env.OPENCLAW_PLACE_LIVE_ORDER;
  if (v === '1') return true;
  const ctx = scriptName ? ` (${scriptName})` : '';
  throw new ExplicitLiveOrderIntentRequiredError(
    `Live order placement refused${ctx}. ` +
    `Set OPENCLAW_PLACE_LIVE_ORDER=1 in the env to confirm explicit intent. ` +
    `This guard exists to prevent accidental re-invocation of a script that transmits orders.`
  );
}

function readLedger(ledgerAbsPath) {
  try {
    const raw = fs.readFileSync(ledgerAbsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.entries) ? parsed : { entries: [] };
  } catch (_) {
    return { entries: [] };
  }
}

function writeLedger(ledgerAbsPath, ledger, retentionMs) {
  const cutoff = Date.now() - retentionMs;
  const pruned = (ledger.entries || []).filter((e) => Number(e.ts || 0) >= cutoff);
  fs.mkdirSync(path.dirname(ledgerAbsPath), { recursive: true });
  fs.writeFileSync(ledgerAbsPath, JSON.stringify({ entries: pruned }, null, 2));
}

/**
 * Look up a previously-recorded outcome by key.
 * Returns the entry { key, ts, outcome } or null.
 * Entries older than retentionMs are treated as expired (not returned).
 */
function lookupIdempotencyEntry({
  key,
  ledgerPath = DEFAULT_LEDGER_PATH,
  rootDir = process.cwd(),
  retentionMs = DEFAULT_RETENTION_MS,
} = {}) {
  if (!key) return null;
  const abs = path.isAbsolute(ledgerPath) ? ledgerPath : path.join(rootDir, ledgerPath);
  const ledger = readLedger(abs);
  const cutoff = Date.now() - retentionMs;
  const entry = ledger.entries.find((e) => e.key === key && Number(e.ts || 0) >= cutoff);
  return entry || null;
}

/**
 * Run fn() at most once per (key) within the retention window.
 *
 * - If a prior outcome exists for key, returns { replayed: true, outcome }
 *   without invoking fn.
 * - Otherwise, invokes fn, records the resolved value as the outcome, and
 *   returns { replayed: false, outcome }.
 * - If fn throws, NOTHING is written to the ledger — failures are not
 *   memoised. (We want a retry to be possible.)
 *
 * If key is falsy, the wrapper is a pass-through (no dedup).
 */
async function withIdempotencyKey({
  key,
  fn,
  ledgerPath = DEFAULT_LEDGER_PATH,
  rootDir = process.cwd(),
  retentionMs = DEFAULT_RETENTION_MS,
} = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('withIdempotencyKey: fn must be a function');
  }
  if (!key) {
    const outcome = await fn();
    return { replayed: false, outcome };
  }
  const abs = path.isAbsolute(ledgerPath) ? ledgerPath : path.join(rootDir, ledgerPath);
  const prior = lookupIdempotencyEntry({ key, ledgerPath: abs, retentionMs });
  if (prior) {
    return { replayed: true, outcome: prior.outcome };
  }
  const outcome = await fn();
  // Append + prune.
  const ledger = readLedger(abs);
  ledger.entries.push({ key, ts: Date.now(), outcome });
  writeLedger(abs, ledger, retentionMs);
  return { replayed: false, outcome };
}

module.exports = {
  requireExplicitLiveOrderIntent,
  withIdempotencyKey,
  lookupIdempotencyEntry,
  ExplicitLiveOrderIntentRequiredError,
  DEFAULT_LEDGER_PATH,
  DEFAULT_RETENTION_MS,
};
