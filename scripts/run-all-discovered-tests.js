#!/usr/bin/env node
'use strict';

/**
 * Lane-aware test runner. Reads `docs/operations/test-manifest.json` and
 * runs the requested lane(s).
 *
 * Usage:
 *   node scripts/run-all-discovered-tests.js                    # safe + integration
 *   node scripts/run-all-discovered-tests.js --lane=safe
 *   node scripts/run-all-discovered-tests.js --lane=integration
 *   node scripts/run-all-discovered-tests.js --lane=live-smoke
 *   node scripts/run-all-discovered-tests.js --lane=external
 *   node scripts/run-all-discovered-tests.js --lane=all
 *   node scripts/run-all-discovered-tests.js --timeout-ms=120000
 *   node scripts/run-all-discovered-tests.js --bail
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'docs/operations/test-manifest.json');

const DEFAULT_LANES = ['safe', 'integration'];
const VALID_LANES = ['safe', 'integration', 'live-smoke', 'external', 'all'];
const DEFAULT_TIMEOUT_MS = 60_000;

function parseArgs(argv) {
  const out = { lanes: DEFAULT_LANES, timeoutMs: DEFAULT_TIMEOUT_MS, bail: false };
  for (const arg of argv) {
    if (arg.startsWith('--lane=')) {
      const v = arg.slice('--lane='.length);
      if (!VALID_LANES.includes(v)) {
        throw new Error(`invalid --lane=${v}; valid: ${VALID_LANES.join(', ')}`);
      }
      out.lanes = v === 'all' ? ['safe', 'integration', 'live-smoke', 'external'] : [v];
    } else if (arg.startsWith('--timeout-ms=')) {
      out.timeoutMs = Number(arg.slice('--timeout-ms='.length));
    } else if (arg === '--bail') {
      out.bail = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: run-all-discovered-tests.js [--lane=safe|integration|live-smoke|external|all] [--timeout-ms=N] [--bail]');
      process.exit(0);
    } else {
      throw new Error(`unknown arg: ${arg}`);
    }
  }
  return out;
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`[run-all] manifest missing: ${MANIFEST_PATH}`);
    console.error('         run: node scripts/discover-test-suites.js');
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function runOne(rel, timeoutMs) {
  const abs = path.join(ROOT, rel);
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [abs], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs,
    encoding: 'utf8',
  });
  const durationMs = Date.now() - startedAt;
  const ok = !result.error && result.status === 0;
  return {
    path: rel,
    ok,
    durationMs,
    status: result.status,
    signal: result.signal,
    timedOut: result.error && result.error.code === 'ETIMEDOUT',
    stdoutTail: ok ? '' : (result.stdout || '').slice(-2000),
    stderrTail: ok ? '' : (result.stderr || '').slice(-2000),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifest = loadManifest();
  const targets = manifest.entries.filter((e) => args.lanes.includes(e.lane));
  const runnable = targets.filter((e) => !e.quarantined);
  const skipped = targets.filter((e) => e.quarantined);

  console.log(`[run-all] lanes=${args.lanes.join(',')} runnable=${runnable.length} quarantined=${skipped.length} timeout=${args.timeoutMs}ms`);
  for (const s of skipped) {
    console.log(`[run-all] SKIP (quarantined) ${s.path} — ${s.quarantineReason || 'no reason given'}`);
  }

  const results = [];
  let failures = 0;
  for (const entry of runnable) {
    process.stdout.write(`[run-all] ▶ ${entry.path} (${entry.lane}) ... `);
    const r = runOne(entry.path, args.timeoutMs);
    results.push(r);
    if (r.ok) {
      console.log(`ok (${r.durationMs}ms)`);
    } else {
      failures++;
      console.log(`FAIL (${r.durationMs}ms, status=${r.status}${r.timedOut ? ', TIMEOUT' : ''})`);
      if (r.stderrTail) console.log('  stderr:', r.stderrTail.split('\n').slice(-10).join('\n  '));
      if (args.bail) break;
    }
  }

  const totalMs = results.reduce((s, r) => s + r.durationMs, 0);
  const summary = {
    ok: failures === 0,
    lanes: args.lanes,
    runnable: runnable.length,
    quarantined: skipped.length,
    passed: results.filter((r) => r.ok).length,
    failed: failures,
    totalMs,
    failures: results.filter((r) => !r.ok).map((r) => ({
      path: r.path, status: r.status, timedOut: r.timedOut, durationMs: r.durationMs,
    })),
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(failures === 0 ? 0 : 1);
}

if (require.main === module) main();
