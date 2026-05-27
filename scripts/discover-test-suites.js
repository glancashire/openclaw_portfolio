#!/usr/bin/env node
'use strict';

/**
 * Discover and categorise every `test-*.js` file under scripts/ and tests/
 * into one of four lanes (safe | integration | live-smoke | external) and
 * write `docs/operations/test-manifest.json`.
 *
 * Heuristic categorisation. See `docs/operations/test-lanes.md` and
 * `phase-W10-automated-verification-lanes-plan.md`.
 *
 * Usage:
 *   node scripts/discover-test-suites.js          # write manifest
 *   node scripts/discover-test-suites.js --check  # fail if manifest stale
 */

const fs = require('fs');
const path = require('path');
const { checks } = require('../src/reporting/verifyRepoChecks');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'docs/operations/test-manifest.json');
const SCAN_DIRS = ['scripts', 'tests'];

// Explicit overrides for files where the heuristic gets it wrong, or where
// the lane decision is policy rather than heuristic.
const OVERRIDES = {
  // Static source-grep tests (no actual broker calls).
  'scripts/test-monitor-fills-real-orders.js': { lane: 'safe', reason: 'source-grep over monitor-fills.js, no execution' },
  // Mailgun smoke (sends real email).
  'scripts/test-mailgun.js': { lane: 'external', reason: 'sends real Mailgun email' },
  'scripts/test-mailgun-inbound.js': { lane: 'safe', reason: 'unit test of inbound parser, no network' },
  'scripts/test-trade-notification-email.js': { lane: 'external', reason: 'sends real trade notification email' },
  'scripts/test-trade-notify-action-currency-normalization.js': { lane: 'safe', reason: 'pure formatter unit test' },
  // Broker auth / socket smoke tests.
  'scripts/test-interactive-brokers-auth.js': { lane: 'live-smoke', reason: 'authenticates against live IBKR gateway' },
  'scripts/test-interactive-brokers-native-socket.js': { lane: 'live-smoke', reason: 'opens TCP socket to IBKR gateway' },
  'scripts/test-interactive-brokers-native-client.js': { lane: 'live-smoke', reason: 'connects via native client' },
  'scripts/test-broker-adapter-completeness.js': { lane: 'safe', reason: 'mocks broker client via Module._load patch; no real network' },
  'tests/test-ibkr-readiness.js': { lane: 'safe', reason: 'pure unit test of readiness summarizer' },
  'scripts/test-ibkr-readiness.js': { lane: 'safe', reason: 'pure unit test if present' },
  // The discoverer / harness itself.
  'scripts/test-all.js': { skip: true, reason: 'legacy runner wrapper, not a test' },
  'scripts/test-test-manifest-shape.js': { lane: 'safe', reason: 'validates the manifest itself' },
};

// Patterns that flip a file into a particular lane regardless of imports.
const FILENAME_RULES = [
  { pattern: /test-mailgun(\.|-)/, lane: 'external' },
  { pattern: /test-interactive-brokers-(auth|native-socket|native-client)\.js$/, lane: 'live-smoke' },
];

// Imports that imply each lane. Order matters: external > live-smoke > integration.
const EXTERNAL_IMPORTS = [
  /require\(['"][^'"]*lib\/mailgun['"]\)/,
  /require\(['"]node-fetch['"]\)/,
  /require\(['"]@sendgrid/,
];

const LIVE_SMOKE_IMPORTS = [
  // Broker client modules (the connection-bearing ones, not pure helpers).
  /require\(['"][^'"]*brokers\/interactive-brokers\/client['"]\)/,
  /require\(['"][^'"]*brokers\/interactive-brokers\/nativeClient['"]\)/,
  /require\(['"]@stoqey\/ib['"]\)/,
];

// Markers that the file actually performs network/connection work.
const LIVE_NETWORK_MARKERS = [
  /\.authenticate\(/,
  /\.connect\(/,
  /new\s+IB\(/,
  /global\.fetch\(/,
  /\bhttp\.request\(/,
  /\bhttps\.request\(/,
];

function listTestFiles() {
  const out = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs).sort()) {
      if (!/^test-.*\.js$/.test(entry)) continue;
      out.push(path.join(dir, entry));
    }
  }
  return out;
}

function classify(relPath, source) {
  const override = OVERRIDES[relPath];
  if (override) {
    if (override.skip) return null;
    return { lane: override.lane, reason: override.reason };
  }

  for (const rule of FILENAME_RULES) {
    if (rule.pattern.test(relPath)) {
      return { lane: rule.lane, reason: `filename matches ${rule.pattern}` };
    }
  }

  for (const re of EXTERNAL_IMPORTS) {
    if (re.test(source)) return { lane: 'external', reason: `imports external service (${re})` };
  }

  // Live-smoke requires BOTH broker import AND network marker. A test that
  // imports the client purely to assert on its shape stays `safe`.
  const importsBroker = LIVE_SMOKE_IMPORTS.some((re) => re.test(source));
  const hitsNetwork = LIVE_NETWORK_MARKERS.some((re) => re.test(source));
  if (importsBroker && hitsNetwork) {
    return { lane: 'live-smoke', reason: 'imports broker client and exercises connection' };
  }

  // Safe = pure assert, no broker imports at all, no fetch, no child_process
  // spawning of network-bound scripts. Be conservative: any file that touches
  // runtime fixtures or spawns child processes goes to `integration`.
  const looksSafe = (
    !importsBroker
    && !/require\(['"]child_process['"]\)/.test(source)
    && !/runtime\//.test(source)
    && !/portfolio\//.test(source)
    && /require\(['"]assert['"]\)|\bassert\(/.test(source)
  );
  if (looksSafe) return { lane: 'safe', reason: 'pure assert-style unit test' };

  return { lane: 'integration', reason: 'default: needs filesystem / portfolio fixtures' };
}

function buildVerifyRepoSet() {
  const set = new Set();
  for (const [, args] of checks) {
    if (Array.isArray(args) && typeof args[0] === 'string') {
      // verifyRepoChecks entries reference scripts (test-* and other helpers).
      // Only mark test-* files.
      const rel = args[0];
      if (/(scripts|tests)\/test-.*\.js$/.test(rel)) set.add(rel);
    }
  }
  return set;
}

function buildManifest() {
  const verifySet = buildVerifyRepoSet();
  const files = listTestFiles();
  const entries = [];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    const source = fs.readFileSync(abs, 'utf8');
    const result = classify(rel, source);
    if (!result) continue; // explicit skip
    entries.push({
      path: rel,
      lane: result.lane,
      reason: result.reason,
      inVerifyRepoChecks: verifySet.has(rel),
      quarantined: false,
    });
  }
  // Quarantines: tests known to fail today; documented and skipped by runner.
  // (Empty for now — populated as we run --lane=safe and observe failures.)
  applyQuarantines(entries);

  // Validate every verifyRepoChecks test-* file is represented.
  for (const rel of verifySet) {
    if (!entries.some((e) => e.path === rel)) {
      // Curated check references a file that doesn't exist on disk anymore.
      // That's a verifyRepoChecks bug, not ours — surface it loudly.
      throw new Error(`verifyRepoChecks references missing file: ${rel}`);
    }
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  const tally = entries.reduce((acc, e) => {
    acc[e.lane] = (acc[e.lane] || 0) + 1;
    return acc;
  }, {});

  return {
    version: 1,
    generatedBy: 'scripts/discover-test-suites.js',
    description: 'Lane categorisation for every test-*.js under scripts/ and tests/. See docs/operations/test-lanes.md.',
    lanes: ['safe', 'integration', 'live-smoke', 'external'],
    counts: {
      total: entries.length,
      ...tally,
      inVerifyRepoChecks: entries.filter((e) => e.inVerifyRepoChecks).length,
      quarantined: entries.filter((e) => e.quarantined).length,
    },
    entries,
  };
}

function applyQuarantines(entries) {
  // Populated by `npm run test:all -- --lane=safe` runs. Tests here are
  // pre-existing failures NOT introduced by W10. Re-categorise or fix in
  // a follow-up wave; the W10 brief explicitly says "don't fix, just
  // quarantine".
  const QUARANTINE = {
    'scripts/test-delivery-executor.js': 'pre-existing: html payload no longer includes "Demo summary" literal (W10 quarantine)',
    'scripts/test-health-report-trends.js': 'pre-existing: assertion against current trend formatting drifts (W10 quarantine)',
    'scripts/test-portfolio-etf-instruments.js': 'pre-existing: portfolio fixture drift (W10 quarantine)',
    'scripts/test-target-gap-deployment.js': 'pre-existing: deployment math expects 1000 but gets 2500; behaviour change predates W10 (W10 quarantine)',
  };
  for (const e of entries) {
    if (QUARANTINE[e.path]) {
      e.quarantined = true;
      e.quarantineReason = QUARANTINE[e.path];
    }
  }
}

function writeManifest(manifest) {
  const json = JSON.stringify(manifest, null, 2) + '\n';
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, json);
  return json;
}

function main() {
  const checkMode = process.argv.includes('--check');
  const manifest = buildManifest();
  const next = JSON.stringify(manifest, null, 2) + '\n';

  if (checkMode) {
    const current = fs.existsSync(MANIFEST_PATH) ? fs.readFileSync(MANIFEST_PATH, 'utf8') : '';
    if (current !== next) {
      console.error('[discover-test-suites] manifest is stale. Run: node scripts/discover-test-suites.js');
      process.exit(2);
    }
    console.log(JSON.stringify({ ok: true, mode: 'check', counts: manifest.counts }, null, 2));
    return;
  }

  writeManifest(manifest);
  console.log(JSON.stringify({ ok: true, wrote: path.relative(ROOT, MANIFEST_PATH), counts: manifest.counts }, null, 2));
}

if (require.main === module) main();

module.exports = { buildManifest, MANIFEST_PATH };
