'use strict';

/**
 * Phase J — Targeted second-pass autofix.
 *
 * Runs AFTER attemptSafeSelfHeal (pass 1) when the post-pass-1 health state
 * is still 'attention' or 'critical'. Each fixer is whitelisted, idempotent,
 * and never touches execution paths, basket approval state, or broker writes.
 *
 * Rate-limited: each blocker code can attempt a pass-2 fix at most once per
 * 24 hours, persisted in <portfolioDir>/health-pass2-rate.json. This prevents
 * a stuck symptom from masking a real problem.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RATE_LIMIT_MS = 24 * 60 * 60 * 1000;

// ── Persistent rate-limit state ───────────────────────────────────────────────

function rateStatePath(portfolioDir) {
  return path.join(portfolioDir, 'health-pass2-rate.json');
}

function loadRateState(portfolioDir) {
  try {
    return JSON.parse(fs.readFileSync(rateStatePath(portfolioDir), 'utf8'));
  } catch { return {}; }
}

function saveRateState(portfolioDir, state) {
  try {
    fs.writeFileSync(rateStatePath(portfolioDir), JSON.stringify(state, null, 2) + '\n');
  } catch { /* best-effort */ }
}

// ── Fixer registry ────────────────────────────────────────────────────────────

/**
 * Each fixer signature: ({ blocker, report, portfolioDir, repoRoot, now }) => { ok, detail, error? }
 */

async function reconcileInflightRows({ report, portfolioDir, repoRoot, env = process.env }) {
  // Pull the broker order ids from the rows that need reconciliation.
  // We reuse the existing sync-portfolio-order-status.js script (per-order, idempotent).
  const { actionableLifecycleRows } = require('./portfolioData');
  const { normalizeLifecycleStatus, isSubmittedAwaitingReconcile } = require('../execution/lifecycleStatus');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  if (!fs.existsSync(tradesPath)) return { ok: false, error: 'trades.md not found' };

  const rows = actionableLifecycleRows(tradesPath);
  const now = new Date();
  const candidates = rows.filter((row) => {
    const normalized = normalizeLifecycleStatus(row.status || '', row.brokerOrder || {});
    if (!isSubmittedAwaitingReconcile(row, normalized, now)) return false;
    const id = String(row.brokerOrderId || '').trim();
    return id.length > 0;
  });

  if (candidates.length === 0) {
    return { ok: true, detail: 'no awaiting-reconcile rows found' };
  }

  const reconcileScript = path.join(repoRoot, 'scripts', 'sync-portfolio-order-status.js');
  if (!fs.existsSync(reconcileScript)) return { ok: false, error: 'sync-portfolio-order-status.js missing' };

  const portfolioRel = path.relative(repoRoot, portfolioDir) || portfolioDir;
  const results = [];
  for (const row of candidates) {
    const id = String(row.brokerOrderId).trim();
    try {
      const out = execFileSync(process.execPath, [reconcileScript, portfolioRel, id], {
        cwd: repoRoot,
        env,
        encoding: 'utf8',
        timeout: 30000,
      });
      const parsed = JSON.parse(out);
      results.push({ id, ok: !!parsed.ok, updated: parsed.reconcile?.updated || 0 });
    } catch (err) {
      results.push({ id, ok: false, error: err.message || String(err) });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return {
    ok: okCount > 0,
    detail: `reconciled ${okCount}/${results.length} stale orders`,
    results,
  };
}

async function repollBrokerReadiness({ repoRoot, env = process.env }) {
  // Wait briefly then re-probe. No state mutation, just refreshes the cached
  // readiness so the next collectHealthSignals sees the latest.
  await new Promise((r) => setTimeout(r, 1500));
  const probeScript = path.join(repoRoot, 'scripts', 'check-interactive-brokers-readiness.js');
  if (!fs.existsSync(probeScript)) return { ok: false, error: 'readiness probe missing' };
  try {
    const out = execFileSync(process.execPath, [probeScript], {
      cwd: repoRoot, env, encoding: 'utf8', timeout: 15000,
    });
    const parsed = JSON.parse(out);
    return { ok: !!(parsed.reachable && parsed.authenticated), detail: parsed.fallbackRequired ? 'still degraded' : 'healthy on re-probe' };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

async function regenerateFillNotificationsIndex({ portfolioDir }) {
  // Best-effort: regenerate the dashboard, which reads the fill state and
  // produces the canonical fill-notification view. Pass-1 already does this,
  // so this fixer is mostly a defensive marker. We do NOT call any "send"
  // path; this is local artifact regen only.
  try {
    const { regenerateDashboard } = require('./dashboardGenerator');
    const dashPath = await regenerateDashboard(portfolioDir);
    return { ok: true, detail: 'dashboard re-rendered', dashPath };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

async function bumpDashboardFreshness({ portfolioDir }) {
  try {
    const { regenerateDashboard } = require('./dashboardGenerator');
    const dashPath = await regenerateDashboard(portfolioDir);
    return { ok: true, detail: 'dashboard regenerated to refresh freshness', dashPath };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

// Whitelist mapping. Function values must match a fixer signature above.
const FIXERS = {
  delivery_attention_reconcile: { fixer: reconcileInflightRows, label: 'reconcile awaiting-reconcile rows' },
  delivery_attention_dashboard: { fixer: bumpDashboardFreshness, label: 'regenerate dashboard for freshness' },
  broker_unready: { fixer: repollBrokerReadiness, label: 'repoll broker readiness' },
  fill_notification_backfill: { fixer: regenerateFillNotificationsIndex, label: 'regenerate fill-notification index' },
  delivery_freshness_stale: { fixer: bumpDashboardFreshness, label: 'bump dashboard freshness' },
};

// Map a real blocker (code + message) to the fixer key.
function pickFixerKey(blocker) {
  if (!blocker || !blocker.code) return null;
  const code = String(blocker.code).toLowerCase();
  const msg = String(blocker.message || '').toLowerCase();

  if (code === 'broker_unready') return 'broker_unready';
  if (code === 'fill_notification_backfill') return 'fill_notification_backfill';
  if (code === 'delivery_freshness_stale') return 'delivery_freshness_stale';

  if (code === 'delivery_attention') {
    if (/sync-portfolio-order-status to reconcile|awaiting-reconcile|awaiting reconcile/i.test(msg)) {
      return 'delivery_attention_reconcile';
    }
    if (/freshness/i.test(msg)) return 'delivery_attention_dashboard';
    return null; // unknown delivery message — leave for human review
  }

  return null;
}

// Hard exclusions — never auto-fix, period.
const HARD_EXCLUDED_CODES = new Set([
  'broker_automation_paused',
  'stop_automation',
  'stale_needs_reapproval',
  'broker_quote_unavailable',
]);

// ── Top-level dispatcher ──────────────────────────────────────────────────────

async function runSecondPassFixers({ report, portfolioDir, repoRoot = process.cwd(), now = new Date(), fixersOverride = null, env = process.env }) {
  const result = { attempted: [], rateLimited: [], skipped: [] };
  const blockers = Array.isArray(report?.health?.blockers) ? report.health.blockers : [];
  if (!blockers.length) return result;

  const fixers = fixersOverride || FIXERS;
  const rateState = loadRateState(portfolioDir);
  const nowMs = now.getTime();
  let rateStateChanged = false;

  for (const blocker of blockers) {
    const code = String(blocker?.code || '');
    if (HARD_EXCLUDED_CODES.has(code.toLowerCase())) {
      result.skipped.push({ code, reason: 'hard_excluded' });
      continue;
    }

    const fixerKey = pickFixerKey(blocker);
    if (!fixerKey || !fixers[fixerKey]) {
      result.skipped.push({ code, reason: 'no_fixer_in_whitelist' });
      continue;
    }

    const lastMs = Number(rateState[fixerKey] || 0);
    if (nowMs - lastMs < RATE_LIMIT_MS) {
      result.rateLimited.push({
        code,
        fixerKey,
        lastAttemptedAt: new Date(lastMs).toISOString(),
        nextEligibleAt: new Date(lastMs + RATE_LIMIT_MS).toISOString(),
      });
      continue;
    }

    const t0 = Date.now();
    let outcome;
    try {
      outcome = await fixers[fixerKey].fixer({ blocker, report, portfolioDir, repoRoot, now, env });
    } catch (err) {
      outcome = { ok: false, error: err.message || String(err) };
    }
    const durationMs = Date.now() - t0;
    result.attempted.push({
      code,
      fixerKey,
      label: fixers[fixerKey].label,
      ok: !!outcome.ok,
      detail: outcome.detail || null,
      error: outcome.error || null,
      durationMs,
      results: outcome.results || null,
    });
    rateState[fixerKey] = nowMs;
    rateStateChanged = true;
  }

  if (rateStateChanged) saveRateState(portfolioDir, rateState);

  return result;
}

module.exports = {
  runSecondPassFixers,
  pickFixerKey,
  FIXERS,
  HARD_EXCLUDED_CODES,
  RATE_LIMIT_MS,
  // exposed for test patching
  _internal: {
    reconcileInflightRows,
    repollBrokerReadiness,
    regenerateFillNotificationsIndex,
    bumpDashboardFreshness,
    loadRateState,
    saveRateState,
  },
};
