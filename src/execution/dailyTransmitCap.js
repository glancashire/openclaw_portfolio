'use strict';

/**
 * Daily transmit cap (Phase L1.B, 2026-06-05)
 *
 * Refuses to transmit a new basket if the cumulative CHF notional of
 * baskets transmitted today (UTC) plus the new basket would exceed
 * the daily cap. Defends against a series of single-basket-cap-sized
 * baskets adding up to a much larger move than intended.
 *
 * Reads runtime/basket-runs/<portfolio>/*.json — these are written by
 * the basket runner immediately after legs are submitted/filled, so
 * any historical transmit attempt today is reflected (including
 * cancelled or failed legs, which still count as "we sent the order").
 *
 * Per-portfolio cap. Defaults to CHF 50k (matches per-basket cap, so
 * the conservative read is "one basket per day at the cap").
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_DAILY_CAP_CHF = 50000;

function startOfUtcDay(date = new Date()) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function isoDate(date = new Date()) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

/**
 * Sum the CHF notional of every leg that was transmitted today across
 * all baskets for a portfolio. We use the basket-runs artefact's
 * `updatedAt` (or file mtime as fallback) to decide whether the
 * transmit happened today.
 *
 * For each leg we count: (avgFillPrice || limitPrice) * fillQuantity
 * (or quantity if the leg didn't fill but was submitted), converted
 * to CHF via the supplied fxLookup.
 *
 * Cancelled and failed legs still count if they were `submitted` or
 * later — once an order is on the wire we consider it transmitted
 * for cap purposes (otherwise an attacker could spam cancellations).
 *
 * @param {object} params
 * @param {string} params.portfolio
 * @param {string} params.rootDir
 * @param {Date}   [params.now]
 * @param {function(string): number} [params.fxLookup]  currency → multiplier to CHF
 * @param {string} [params.excludeApprovalId]  ignore this basket id
 *   (used so a re-run of the same approval doesn't double-count).
 * @returns {{ chfTransmittedToday: number, byApproval: Array, files: Array }}
 */
function sumTransmittedToday({ portfolio, rootDir, now = new Date(), fxLookup = () => 1, excludeApprovalId = null } = {}) {
  if (!portfolio) throw new Error('sumTransmittedToday: portfolio required');
  if (!rootDir)   throw new Error('sumTransmittedToday: rootDir required');

  const dir = path.join(rootDir, 'runtime', 'basket-runs', portfolio);
  if (!fs.existsSync(dir)) return { chfTransmittedToday: 0, byApproval: [], files: [] };

  const today = isoDate(now);
  const startMs = startOfUtcDay(now).getTime();
  const endMs = startMs + 24 * 60 * 60 * 1000;

  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => path.join(dir, f));

  const byApproval = [];
  let total = 0;

  for (const file of files) {
    let raw;
    try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { continue; }
    if (!raw || typeof raw !== 'object') continue;
    if (raw.portfolio && raw.portfolio !== portfolio) continue;
    if (excludeApprovalId && raw.approvalId === excludeApprovalId) continue;

    // Decide whether this run "happened today" — prefer updatedAt, then createdAt, then mtime.
    const ts = Date.parse(raw.updatedAt || raw.createdAt || '') || fs.statSync(file).mtimeMs;
    if (!(ts >= startMs && ts < endMs)) continue;

    let basketChf = 0;
    const legs = raw.legs && typeof raw.legs === 'object' ? Object.values(raw.legs) : [];
    for (const leg of legs) {
      // status taxonomy in basketExecutionRunner.js: filled, submitted, cancelled, blocked, failed.
      // 'blocked' means safeguards (or eligibility) refused before transmit — DON'T count.
      // 'failed' means broker rejected — order was placed; count.
      // 'submitted'/'cancelled'/'filled' all mean it was on the wire.
      if (leg.status === 'blocked') continue;
      if (!leg.status) continue;

      const price = Number(leg.avgFillPrice || leg.limitPrice || 0);
      const qty = Number(leg.fillQuantity || leg.quantity || 0);
      const local = price * qty;
      const fxRate = leg.currency ? Number(fxLookup(leg.currency)) || 1 : 1;
      const chf = local * fxRate;
      if (Number.isFinite(chf) && chf > 0) basketChf += chf;
    }
    if (basketChf > 0) {
      byApproval.push({
        approvalId: raw.approvalId || path.basename(file, '.json'),
        chf: Math.round(basketChf * 100) / 100,
        updatedAt: raw.updatedAt || raw.createdAt || null,
        file,
      });
      total += basketChf;
    }
  }

  return {
    today,
    chfTransmittedToday: Math.round(total * 100) / 100,
    byApproval,
    files,
  };
}

/**
 * Evaluate whether transmitting a new basket would breach the daily
 * cap. Returns { ok, used, remaining, requested, capChf } and on
 * blocker also { code, reason }.
 *
 * @param {object} params
 * @param {string} params.portfolio
 * @param {string} params.rootDir
 * @param {object} params.envelope        approval envelope
 * @param {function} [params.fxLookup]
 * @param {Date}     [params.now]
 * @param {number}   [params.capChf]     default 50000
 * @returns {{ ok, code?, reason?, used, requested, remaining, capChf, byApproval }}
 */
function evaluateDailyTransmitCap({
  portfolio,
  rootDir,
  envelope,
  fxLookup = () => 1,
  now = new Date(),
  capChf = DEFAULT_DAILY_CAP_CHF,
} = {}) {
  if (!envelope || !Array.isArray(envelope.legs)) {
    throw new Error('evaluateDailyTransmitCap: envelope.legs required');
  }

  const usedSummary = sumTransmittedToday({
    portfolio,
    rootDir,
    now,
    fxLookup,
    excludeApprovalId: envelope.approvalId || null,
  });

  let requested = 0;
  for (const leg of envelope.legs) {
    const price = Number(leg.limitPrice || 0);
    const qty = Number(leg.quantity || 0);
    const fxRate = leg.currency ? Number(fxLookup(leg.currency)) || 1 : 1;
    const chf = price * qty * fxRate;
    if (Number.isFinite(chf) && chf > 0) requested += chf;
  }
  requested = Math.round(requested * 100) / 100;

  const used = usedSummary.chfTransmittedToday;
  const remaining = Math.max(0, Math.round((capChf - used) * 100) / 100);
  const wouldBe = Math.round((used + requested) * 100) / 100;

  if (wouldBe > capChf) {
    return {
      ok: false,
      code: 'daily_transmit_cap',
      reason: `daily transmit cap CHF ${capChf} would be exceeded: used=${used}, requested=${requested}, total=${wouldBe}`,
      capChf,
      used,
      requested,
      remaining,
      byApproval: usedSummary.byApproval,
    };
  }

  return {
    ok: true,
    capChf,
    used,
    requested,
    remaining,
    byApproval: usedSummary.byApproval,
  };
}

module.exports = {
  DEFAULT_DAILY_CAP_CHF,
  sumTransmittedToday,
  evaluateDailyTransmitCap,
  _startOfUtcDay: startOfUtcDay,
  _isoDate: isoDate,
};
