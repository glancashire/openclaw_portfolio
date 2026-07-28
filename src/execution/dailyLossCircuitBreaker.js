'use strict';

/**
 * Daily-loss circuit breaker (Phase L2.B, 2026-07-28)
 *
 * Refuses to transmit a new basket if the portfolio's net liquidation
 * value (NLV) has dropped intra-day by more than a configured threshold
 * relative to a start-of-day baseline. Defends against automated
 * rebalancing/execution continuing to fire into a sharp drawdown
 * (fat-finger prices, flash crash, mispriced market data).
 *
 * This is a *transmit freeze*, not a liquidation trigger — it never sells
 * anything, it just blocks new orders until the operator reviews. It sits
 * beside the L1.B daily transmit cap in basketExecutionRunner and returns
 * the same blocker shape.
 *
 * Baseline source: runtime/circuit-breaker/<portfolio>/nlv-baseline.json
 *   { "date": "YYYY-MM-DD", "nlvChf": <number>, "capturedAt": "ISO" }
 * The baseline is captured on the first check of each UTC day (or by a
 * daily sync). Current NLV is supplied by the caller (from the live ledger
 * NetLiquidation) or read from the latest holdings snapshot summary.
 *
 * Threshold: percentage drop (default 8%) OR absolute CHF drop, whichever
 * trips first. Both configurable via safeguardConfig.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_DAILY_LOSS_PCT = 8; // percent of start-of-day NLV
const DEFAULT_MAX_DAILY_LOSS_CHF = null; // optional absolute floor; null = disabled

function startOfUtcDay(date = new Date()) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function isoDate(date = new Date()) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

function baselinePath(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'circuit-breaker', portfolio, 'nlv-baseline.json');
}

function readBaseline(rootDir, portfolio) {
  const p = baselinePath(rootDir, portfolio);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (raw && typeof raw === 'object' && Number.isFinite(Number(raw.nlvChf))) return raw;
  } catch (_) { /* fall through */ }
  return null;
}

function writeBaseline(rootDir, portfolio, payload) {
  const p = baselinePath(rootDir, portfolio);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(payload, null, 2)}\n`);
  return p;
}

/**
 * Ensure a start-of-day baseline exists for `now`'s UTC day. If the stored
 * baseline is for a previous day (or absent), capture `currentNlvChf` as the
 * new baseline. Returns the effective baseline record.
 */
function ensureBaseline({ rootDir, portfolio, currentNlvChf, now = new Date() }) {
  if (!portfolio) throw new Error('ensureBaseline: portfolio required');
  if (!rootDir) throw new Error('ensureBaseline: rootDir required');

  const today = isoDate(now);
  const existing = readBaseline(rootDir, portfolio);
  if (existing && existing.date === today) return existing;

  if (!Number.isFinite(Number(currentNlvChf))) {
    // No baseline and no current value to seed one — nothing to enforce yet.
    return existing || null;
  }
  const record = {
    date: today,
    nlvChf: Math.round(Number(currentNlvChf) * 100) / 100,
    capturedAt: new Date(now).toISOString(),
  };
  writeBaseline(rootDir, portfolio, record);
  return record;
}

/**
 * Evaluate whether transmitting should be frozen due to an intra-day NLV drop.
 * Returns the daily-cap-style shape: { ok, code?, reason?, ... }.
 *
 * @param {object}   params
 * @param {string}   params.portfolio
 * @param {string}   params.rootDir
 * @param {number}   params.currentNlvChf         live NetLiquidation in CHF
 * @param {Date}     [params.now]
 * @param {number}   [params.maxDailyLossPct]     default 8 (percent)
 * @param {number}   [params.maxDailyLossChf]     optional absolute CHF floor
 * @param {boolean}  [params.captureBaseline]     default true; seed baseline if missing
 */
function evaluateDailyLossCircuitBreaker({
  portfolio,
  rootDir,
  currentNlvChf,
  now = new Date(),
  maxDailyLossPct = DEFAULT_MAX_DAILY_LOSS_PCT,
  maxDailyLossChf = DEFAULT_MAX_DAILY_LOSS_CHF,
  captureBaseline = true,
} = {}) {
  if (!portfolio) throw new Error('evaluateDailyLossCircuitBreaker: portfolio required');
  if (!rootDir) throw new Error('evaluateDailyLossCircuitBreaker: rootDir required');

  const baseline = captureBaseline
    ? ensureBaseline({ rootDir, portfolio, currentNlvChf, now })
    : readBaseline(rootDir, portfolio);

  // Can't enforce without both a baseline and a current reading.
  if (!baseline || !Number.isFinite(Number(baseline.nlvChf))) {
    return { ok: true, code: null, reason: 'no_baseline', baseline: baseline || null, currentNlvChf: currentNlvChf ?? null, enforced: false };
  }
  if (!Number.isFinite(Number(currentNlvChf))) {
    return { ok: true, code: null, reason: 'no_current_nlv', baseline, currentNlvChf: null, enforced: false };
  }

  const base = Number(baseline.nlvChf);
  const cur = Number(currentNlvChf);
  const dropChf = Math.round((base - cur) * 100) / 100;
  const dropPct = base > 0 ? Math.round((dropChf / base) * 10000) / 100 : 0;

  const pctBreached = Number.isFinite(maxDailyLossPct) && maxDailyLossPct > 0 && dropPct >= maxDailyLossPct;
  const chfBreached = Number.isFinite(maxDailyLossChf) && maxDailyLossChf > 0 && dropChf >= maxDailyLossChf;

  const detail = {
    baselineNlvChf: base,
    currentNlvChf: cur,
    dropChf,
    dropPct,
    maxDailyLossPct: maxDailyLossPct ?? null,
    maxDailyLossChf: maxDailyLossChf ?? null,
    baselineDate: baseline.date,
    enforced: true,
  };

  if (pctBreached || chfBreached) {
    const trigger = pctBreached ? `${dropPct}% >= ${maxDailyLossPct}%` : `CHF ${dropChf} >= CHF ${maxDailyLossChf}`;
    return {
      ok: false,
      code: 'daily_loss_circuit_breaker',
      reason: `intra-day NLV drop ${trigger}: baseline=${base} current=${cur} (drop CHF ${dropChf}, ${dropPct}%). Transmit frozen pending operator review.`,
      ...detail,
    };
  }

  return { ok: true, code: null, ...detail };
}

module.exports = {
  DEFAULT_MAX_DAILY_LOSS_PCT,
  DEFAULT_MAX_DAILY_LOSS_CHF,
  ensureBaseline,
  readBaseline,
  writeBaseline,
  evaluateDailyLossCircuitBreaker,
  _baselinePath: baselinePath,
  _startOfUtcDay: startOfUtcDay,
  _isoDate: isoDate,
};
