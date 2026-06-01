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
const DOMAIN_SUMMARY_PATH = path.join(ROOT, 'docs/operations/test-coverage-by-domain.json');
const POLICY_PATH = path.join(ROOT, 'config/test-discovery-policy.json');

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

function loadDiscoveryPolicy() {
  return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
}

function listTestFiles(policy) {
  const out = [];
  for (const dir of policy.scanDirs || []) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs).sort()) {
      if (!/^test-.*\.js$/.test(entry)) continue;
      out.push(path.join(dir, entry));
    }
  }
  return out;
}

function classify(relPath, source, policy) {
  const skipReason = policy.skips && policy.skips[relPath];
  if (skipReason) return null;

  const override = policy.overrides && policy.overrides[relPath];
  if (override) {
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

function summarizeDomain(relPath) {
  const base = path.basename(relPath).replace(/^test-/, '').replace(/\.js$/, '');
  return (base.split('-')[0] || base || 'misc').toLowerCase();
}

function buildDomainSummary(entries) {
  const map = new Map();
  for (const entry of entries) {
    const domain = summarizeDomain(entry.path);
    if (!map.has(domain)) {
      map.set(domain, {
        domain,
        total: 0,
        safe: 0,
        integration: 0,
        'live-smoke': 0,
        external: 0,
        quarantined: 0,
        inVerifyRepoChecks: 0,
        examples: [],
      });
    }
    const row = map.get(domain);
    row.total += 1;
    row[entry.lane] += 1;
    if (entry.quarantined) row.quarantined += 1;
    if (entry.inVerifyRepoChecks) row.inVerifyRepoChecks += 1;
    if (row.examples.length < 3) row.examples.push(entry.path);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain));
}

function buildManifest() {
  const policy = loadDiscoveryPolicy();
  const verifySet = buildVerifyRepoSet();
  const files = listTestFiles(policy);
  const entries = [];
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    const source = fs.readFileSync(abs, 'utf8');
    const result = classify(rel, source, policy);
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
  applyQuarantines(entries, policy);

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

function applyQuarantines(entries, policy) {
  const quarantine = policy.quarantines || {};
  for (const e of entries) {
    if (quarantine[e.path]) {
      e.quarantined = true;
      e.quarantineReason = quarantine[e.path];
    }
  }
}

function writeManifest(manifest) {
  const json = JSON.stringify(manifest, null, 2) + '\n';
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, json);
  return json;
}

function writeDomainSummary(manifest) {
  const payload = {
    generatedBy: 'scripts/discover-test-suites.js',
    description: 'Naming-based domain summary derived from test file stems. Useful for coverage transparency, not a formal proof of functional coverage.',
    generatedAt: new Date().toISOString(),
    counts: {
      totalTests: manifest.counts.total,
      domains: buildDomainSummary(manifest.entries).length,
    },
    domains: buildDomainSummary(manifest.entries),
  };
  fs.mkdirSync(path.dirname(DOMAIN_SUMMARY_PATH), { recursive: true });
  fs.writeFileSync(DOMAIN_SUMMARY_PATH, JSON.stringify(payload, null, 2) + '\n');
  return payload;
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
  const domainSummary = writeDomainSummary(manifest);
  console.log(JSON.stringify({ ok: true, wrote: path.relative(ROOT, MANIFEST_PATH), wroteDomainSummary: path.relative(ROOT, DOMAIN_SUMMARY_PATH), counts: manifest.counts, domainCounts: domainSummary.counts }, null, 2));
}

if (require.main === module) main();

module.exports = { buildManifest, MANIFEST_PATH, DOMAIN_SUMMARY_PATH, POLICY_PATH, loadDiscoveryPolicy, classify, buildDomainSummary, summarizeDomain };
