#!/usr/bin/env node
'use strict';

/**
 * test-send-digest-counter-refresh
 *
 * Verifies the Phase C wiring in scripts/send-dashboard-digest.js:
 *
 *   1. The send script imports buildSnapshot + writeSnapshot from usageCounters.
 *   2. The refresh runs BEFORE collectPortfolioSummary in the file.
 *   3. The refresh is wrapped in try/catch so a failure does not abort the send.
 *   4. The "best-effort" failure path emits a single-line stderr warning.
 *
 * Lane: safe
 * Domain: reporting
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

function readSendScript() {
  return fs.readFileSync(path.join(__dirname, 'send-dashboard-digest.js'), 'utf8');
}

function main() {
  const src = readSendScript();

  // (1) imports buildSnapshot + writeSnapshot
  assert(/require\(['"]\.\.\/src\/reporting\/usageCounters['"]\)/.test(src), 'imports usageCounters');
  assert(/buildSnapshot\b/.test(src) && /writeSnapshot\b/.test(src), 'uses buildSnapshot + writeSnapshot');

  // (2) refresh occurs before collectPortfolioSummary
  const refreshIdx = src.indexOf('buildSnapshot(');
  const summaryIdx = src.indexOf('collectPortfolioSummary(');
  assert(refreshIdx > 0, 'buildSnapshot is invoked');
  assert(summaryIdx > refreshIdx, 'refresh runs before collectPortfolioSummary');

  // (3) wrapped in try/catch
  const refreshBlock = src.slice(refreshIdx - 200, refreshIdx + 200);
  assert(/try\s*\{[\s\S]*?buildSnapshot/.test(src), 'refresh block uses try {}');
  assert(/catch\s*\(/.test(refreshBlock), 'catch present near the refresh block');

  // (4) failure path writes a stderr warning
  assert(/process\.stderr\.write\(.*usage-counter/.test(src), 'best-effort warning emitted on failure');

  // Side check: the underlying library is callable and writes a JSON file we can read back.
  const { buildSnapshot, writeSnapshot, readSnapshot } = require('../src/reporting/usageCounters');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-c-'));
  try {
    const tmpCounters = path.join(tmpDir, 'usage-counters.json');
    const repoRoot = path.resolve(__dirname, '..');
    const snap = buildSnapshot(repoRoot);
    writeSnapshot(snap, tmpCounters);
    assert(fs.existsSync(tmpCounters), 'tmp counters file written');
    const round = readSnapshot(tmpCounters);
    assert(round && round.schemaVersion, 'round-trip carries schemaVersion');
    assert(round.generatedAt, 'snapshot has generatedAt');
    const ageMs = Date.now() - new Date(round.generatedAt).getTime();
    assert(ageMs >= 0 && ageMs < 60_000, `snapshot is fresh (age ${ageMs}ms)`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log(JSON.stringify({ ok: true }));
}

main();
