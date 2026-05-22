'use strict';

/* Phase 199 — Cancel-loop circuit breaker.
 *
 * Walks the parent chain of approved baskets (active + archived) and counts
 * consecutive cancellations for a given instrument. When the count crosses a
 * configurable threshold, write a breaker marker file so reproposal builders can
 * exclude the instrument and operator surfaces can flag it.
 */

const fs = require('fs');
const path = require('path');

function approvedBasketDir(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'approved-order-baskets', portfolio);
}

function basketRunDir(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'basket-runs', portfolio);
}

function circuitBreakerDir(rootDir, portfolio) {
  return path.join(rootDir, 'runtime', 'circuit-breakers', portfolio);
}

function safeFilename(instrument) {
  return String(instrument).replace(/[^A-Za-z0-9_.-]/g, '_');
}

/** Find an approved-basket envelope by approvalId. Looks at the active dir then `.superseded`. */
function loadApprovalEnvelopeByLineage({ portfolio, approvalId, rootDir }) {
  const dir = approvedBasketDir(rootDir, portfolio);
  for (const sub of [dir, path.join(dir, '.superseded')]) {
    const candidate = path.join(sub, `${approvalId}.json`);
    if (fs.existsSync(candidate)) {
      try { return { path: candidate, envelope: JSON.parse(fs.readFileSync(candidate, 'utf8')) }; }
      catch (_) { return null; }
    }
  }
  return null;
}

/** Find a run-state file by approvalId in active + archived locations. */
function loadRunStateByLineage({ portfolio, approvalId, rootDir }) {
  const dir = basketRunDir(rootDir, portfolio);
  for (const sub of [dir, path.join(dir, '.superseded')]) {
    const candidate = path.join(sub, `${approvalId}.json`);
    if (fs.existsSync(candidate)) {
      try { return { path: candidate, state: JSON.parse(fs.readFileSync(candidate, 'utf8')) }; }
      catch (_) { return null; }
    }
  }
  return null;
}

/** Walk the lineage from latest to root, returning oldest-first ordering of envelopes. */
function walkReproposalLineage({ portfolio, approvalId, rootDir }) {
  const seen = new Set();
  const chain = [];
  let cur = approvalId;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const env = loadApprovalEnvelopeByLineage({ portfolio, approvalId: cur, rootDir });
    if (!env) break;
    chain.push(env);
    cur = env.envelope?.parentApprovalId || null;
  }
  return chain.reverse();
}

/** Inspect the leg outcome for `instrument` in this run-state. Returns 'filled' | 'cancelled' | 'unknown'. */
function legOutcomeForInstrument(state, instrument) {
  if (!state || !state.legs) return 'unknown';
  for (const leg of Object.values(state.legs)) {
    if (leg.instrument === instrument) {
      if (leg.status === 'filled') return 'filled';
      if (leg.status === 'cancelled') return 'cancelled';
      return 'other';
    }
  }
  return 'unknown';
}

/** Count consecutive cancellations for instrument starting at latestApprovalId, walking back.
 * Stops at the first non-cancelled outcome (filled / unknown / other) or at lineage root.
 * Returns { count, brokerOrderIds, ancestorsWalked, latestApprovalId }.
 */
function countConsecutiveCancellations({ portfolio, instrument, latestApprovalId, rootDir }) {
  const lineageOldestFirst = walkReproposalLineage({ portfolio, approvalId: latestApprovalId, rootDir });
  // Walk newest -> oldest
  const lineageNewestFirst = lineageOldestFirst.slice().reverse();
  let count = 0;
  const brokerOrderIds = [];
  let ancestorsWalked = 0;
  for (const env of lineageNewestFirst) {
    ancestorsWalked++;
    const run = loadRunStateByLineage({ portfolio, approvalId: env.envelope.approvalId, rootDir });
    const outcome = legOutcomeForInstrument(run?.state, instrument);
    if (outcome === 'cancelled') {
      count++;
      const leg = Object.values(run?.state?.legs || {}).find((l) => l.instrument === instrument);
      if (leg?.brokerOrderId) brokerOrderIds.push(leg.brokerOrderId);
    } else if (outcome === 'filled') {
      // fill resets the counter; stop walking back
      break;
    } else {
      // unknown / other — instrument not in this round; keep walking back
      // (filling with a fresh approval can append legs; missing legs in older rounds shouldn't reset)
      continue;
    }
  }
  return { count, brokerOrderIds, ancestorsWalked, latestApprovalId };
}

function loadCircuitBreaker({ portfolio, instrument, rootDir }) {
  const dir = circuitBreakerDir(rootDir, portfolio);
  const file = path.join(dir, `${safeFilename(instrument)}.json`);
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return null; }
}

function saveCircuitBreaker({ portfolio, instrument, rootDir, marker }) {
  const dir = circuitBreakerDir(rootDir, portfolio);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${safeFilename(instrument)}.json`);
  fs.writeFileSync(file, JSON.stringify(marker, null, 2));
  return file;
}

function clearCircuitBreaker({ portfolio, instrument, rootDir }) {
  const dir = circuitBreakerDir(rootDir, portfolio);
  const file = path.join(dir, `${safeFilename(instrument)}.json`);
  if (!fs.existsSync(file)) return { cleared: false, reason: 'no_marker_present' };
  fs.unlinkSync(file);
  return { cleared: true, file };
}

function listCircuitBreakers({ rootDir }) {
  const root = path.join(rootDir, 'runtime', 'circuit-breakers');
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const portfolio of fs.readdirSync(root)) {
    const dir = path.join(root, portfolio);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json')) continue;
      try {
        const marker = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
        out.push({ portfolio, ...marker });
      } catch (_) { /* skip malformed */ }
    }
  }
  return out;
}

/** Evaluate whether to trip / refresh the breaker for a given instrument.
 * Returns { tripped, count, threshold, marker, savedPath? }.
 * If the count >= threshold, persists a marker file (idempotent — updates count + lastSeenAt).
 * If count < threshold and a marker already exists, leaves it untouched (operator may have cleared it).
 */
function evaluateCircuitBreaker({ portfolio, instrument, latestApprovalId, rootDir, threshold = 3, now = new Date() }) {
  const { count, brokerOrderIds, ancestorsWalked } = countConsecutiveCancellations({ portfolio, instrument, latestApprovalId, rootDir });
  const tripped = count >= threshold;
  if (!tripped) return { tripped, count, threshold, marker: null };

  const existing = loadCircuitBreaker({ portfolio, instrument, rootDir });
  const marker = {
    schemaVersion: '1.0',
    portfolio,
    instrument,
    threshold,
    count,
    lastBrokerOrderIds: brokerOrderIds,
    latestApprovalId,
    ancestorsWalked,
    firstTrippedAt: existing?.firstTrippedAt || (typeof now === 'string' ? now : now.toISOString()),
    lastSeenAt: typeof now === 'string' ? now : now.toISOString(),
    recommendedOperatorAction: `Investigate why ${instrument} keeps cancelling at the broker (subscription, liquidity, contract config). When fixed, run: node scripts/clear-circuit-breaker.js --portfolio=${portfolio} --instrument=${instrument}`,
  };
  const savedPath = saveCircuitBreaker({ portfolio, instrument, rootDir, marker });
  return { tripped, count, threshold, marker, savedPath };
}

module.exports = {
  walkReproposalLineage,
  countConsecutiveCancellations,
  loadCircuitBreaker,
  saveCircuitBreaker,
  clearCircuitBreaker,
  listCircuitBreakers,
  evaluateCircuitBreaker,
  loadApprovalEnvelopeByLineage,
  loadRunStateByLineage,
};
