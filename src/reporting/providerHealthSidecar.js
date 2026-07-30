'use strict';

/**
 * Quote-provider health sidecar (fix 2026-07-29).
 *
 * Provider health (per-provider success/failure timestamps, a cumulative
 * consecutive-failure counter, cooldown windows) is *volatile process-global
 * runtime telemetry*. It changes on every quote resolution, so embedding it in
 * deterministic report artifacts (dashboard.md, summary.json) both breaks their
 * regenerate-twice byte-idempotency contract and churns git on every refresh.
 *
 * We persist it instead to a gitignored runtime sidecar that the console view
 * reads. Reports stay deterministic; the operator still sees live health.
 *
 * Path: runtime/quote-provider-health/<portfolio>/health.json  (runtime/ is gitignored)
 */

const fs = require('fs');
const path = require('path');

function sidecarPath(portfolioDir) {
  const portfolioName = path.basename(portfolioDir);
  const repoRoot = path.resolve(portfolioDir, '..', '..');
  return path.join(repoRoot, 'runtime', 'quote-provider-health', portfolioName, 'health.json');
}

/**
 * Persist the computed provider-health rows. Never throws — health telemetry
 * must never break report generation.
 * @returns the written path, or null on failure.
 */
function writeProviderHealthSidecar({ portfolioDir, rows = [], capturedAt = new Date().toISOString() } = {}) {
  try {
    const target = sidecarPath(portfolioDir);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify({ version: 1, capturedAt, rows }, null, 2)}\n`);
    return target;
  } catch {
    return null;
  }
}

/**
 * Read the sidecar. Never throws; returns { rows, capturedAt } with safe
 * defaults when absent or unreadable.
 */
function readProviderHealthSidecar({ portfolioDir } = {}) {
  try {
    const target = sidecarPath(portfolioDir);
    if (!fs.existsSync(target)) return { rows: [], capturedAt: null };
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
    return {
      rows: Array.isArray(parsed.rows) ? parsed.rows : [],
      capturedAt: parsed.capturedAt || null,
    };
  } catch {
    return { rows: [], capturedAt: null };
  }
}

module.exports = { sidecarPath, writeProviderHealthSidecar, readProviderHealthSidecar };
