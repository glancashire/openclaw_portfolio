'use strict';

/**
 * Validate the shape of `docs/operations/test-manifest.json`. Wired into
 * `verifyRepoChecks` so the curated gate fails when the manifest drifts.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'docs/operations/test-manifest.json');
const DOMAIN_SUMMARY_PATH = path.join(ROOT, 'docs/operations/test-coverage-by-domain.json');
const POLICY_PATH = path.join(ROOT, 'config/test-discovery-policy.json');
const VALID_LANES = new Set(['safe', 'integration', 'live-smoke', 'external']);
const REQUIRED_FIELDS = ['path', 'lane', 'inVerifyRepoChecks'];

function loadVerifySet() {
  const { checks } = require('../src/reporting/verifyRepoChecks');
  const set = new Set();
  for (const [, args] of checks) {
    if (Array.isArray(args) && typeof args[0] === 'string') {
      const rel = args[0];
      if (/(scripts|tests)\/test-.*\.js$/.test(rel)) set.add(rel);
    }
  }
  return set;
}

function listOnDiskTestFiles() {
  const out = new Set();
  for (const dir of ['scripts', 'tests']) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs)) {
      if (/^test-.*\.js$/.test(entry)) out.add(path.join(dir, entry));
    }
  }
  // The legacy runner wrapper is intentionally excluded from the manifest.
  out.delete('scripts/test-all.js');
  return out;
}

function main() {
  assert(fs.existsSync(MANIFEST_PATH), `manifest missing at ${MANIFEST_PATH}`);
  assert(fs.existsSync(DOMAIN_SUMMARY_PATH), `domain summary missing at ${DOMAIN_SUMMARY_PATH}`);
  assert(fs.existsSync(POLICY_PATH), `discovery policy missing at ${POLICY_PATH}`);
  const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const domainRaw = fs.readFileSync(DOMAIN_SUMMARY_PATH, 'utf8');
  const policyRaw = fs.readFileSync(POLICY_PATH, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    throw new Error(`manifest is not valid JSON: ${err.message}`);
  }

  let domainSummary;
  let policy;
  try { domainSummary = JSON.parse(domainRaw); } catch (err) { throw new Error(`domain summary is not valid JSON: ${err.message}`); }
  try { policy = JSON.parse(policyRaw); } catch (err) { throw new Error(`discovery policy is not valid JSON: ${err.message}`); }

  assert(Array.isArray(manifest.entries), 'manifest.entries must be an array');
  assert(manifest.entries.length > 0, 'manifest.entries must be non-empty');
  assert.strictEqual(policy.version, 1, 'discovery policy version must be 1');
  assert(Array.isArray(policy.scanDirs) && policy.scanDirs.length > 0, 'discovery policy scanDirs must be non-empty');
  assert(domainSummary && typeof domainSummary === 'object', 'domain summary must be an object');
  assert(Array.isArray(domainSummary.domains), 'domain summary domains must be an array');

  // Per-entry shape.
  const seen = new Set();
  for (const e of manifest.entries) {
    for (const f of REQUIRED_FIELDS) {
      assert(Object.prototype.hasOwnProperty.call(e, f), `entry ${e.path || '?'} missing field ${f}`);
    }
    assert(typeof e.path === 'string' && e.path.length > 0, 'entry.path must be a non-empty string');
    assert(VALID_LANES.has(e.lane), `entry ${e.path}: invalid lane ${e.lane}`);
    assert(typeof e.inVerifyRepoChecks === 'boolean', `entry ${e.path}: inVerifyRepoChecks must be boolean`);
    assert(!seen.has(e.path), `duplicate manifest entry: ${e.path}`);
    seen.add(e.path);
    const abs = path.join(ROOT, e.path);
    assert(fs.existsSync(abs), `manifest references missing file: ${e.path}`);
  }

  // Sorted for diff stability.
  const sorted = [...manifest.entries].map((e) => e.path);
  const expected = [...sorted].sort();
  assert.deepStrictEqual(sorted, expected, 'manifest entries must be sorted by path');

  // Cross-check vs verifyRepoChecks.
  const verifySet = loadVerifySet();
  for (const rel of verifySet) {
    const entry = manifest.entries.find((e) => e.path === rel);
    assert(entry, `verifyRepoChecks entry ${rel} not present in manifest`);
    assert.strictEqual(entry.inVerifyRepoChecks, true,
      `manifest must mark ${rel} as inVerifyRepoChecks: true`);
  }
  for (const e of manifest.entries) {
    if (e.inVerifyRepoChecks) {
      assert(verifySet.has(e.path),
        `manifest claims ${e.path} is in verifyRepoChecks but it isn't`);
    }
  }

  // Cross-check vs disk: every test file is represented.
  const onDisk = listOnDiskTestFiles();
  for (const rel of onDisk) {
    assert(seen.has(rel), `on-disk test file ${rel} missing from manifest (run scripts/discover-test-suites.js)`);
  }
  for (const rel of seen) {
    assert(onDisk.has(rel), `manifest references file not on disk: ${rel}`);
  }

  assert.strictEqual(domainSummary.counts.totalTests, manifest.counts.total, 'domain summary totalTests must match manifest total');
  const domainTotal = domainSummary.domains.reduce((sum, row) => sum + Number(row.total || 0), 0);
  assert.strictEqual(domainTotal, manifest.counts.total, 'domain summary domain totals must add up to manifest total');
  assert.strictEqual(domainSummary.counts.domains, domainSummary.domains.length, 'domain summary domain count must match rows length');

  console.log(JSON.stringify({
    ok: true,
    entries: manifest.entries.length,
    counts: manifest.counts,
    domains: domainSummary.counts.domains,
  }, null, 2));
}

main();
