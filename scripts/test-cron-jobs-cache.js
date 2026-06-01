'use strict';

/**
 * Tests for the in-process TTL cache in src/reporting/cronJobsFetcher.js.
 * We stub PATH so 'openclaw' resolves to a controllable script and we
 * can count invocations.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}

// Set up a fake `openclaw` on PATH that writes a counter file
const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cron-stub-'));
const counterPath = path.join(stubDir, 'count');
fs.writeFileSync(counterPath, '0');
const stubScript = `#!/bin/sh
read N < ${counterPath}
echo $((N + 1)) > ${counterPath}
echo '{"jobs": []}'
`;
const stubPath = path.join(stubDir, 'openclaw');
fs.writeFileSync(stubPath, stubScript);
fs.chmodSync(stubPath, 0o755);

process.env.PATH = `${stubDir}:${process.env.PATH || ''}`;

// Now require AFTER setting PATH (no effect either way since execSync resolves at call time).
const { fetchCronJobs, fetchCronHealth, clearCronCache, _peekCronCache, DEFAULT_CACHE_TTL_MS } =
  require('../src/reporting/cronJobsFetcher');

function readCount() { return Number(fs.readFileSync(counterPath, 'utf8')); }

clearCronCache();
fs.writeFileSync(counterPath, '0');

// 1. First call → spawns
{
  fetchCronJobs();
  ok('first call invokes CLI', readCount() === 1);
  ok('cache populated after first call', _peekCronCache() !== null);
  ok('first call returns ok status', fetchCronJobs().status === 'ok');
}

// 2. Subsequent calls within TTL → no spawn
{
  fetchCronJobs();
  fetchCronJobs();
  fetchCronJobs();
  ok('subsequent calls within TTL do not spawn (count unchanged)', readCount() === 1);
}

// 3. fetchCronHealth also hits cache
{
  const health = fetchCronHealth();
  ok('fetchCronHealth uses the same cache (still 1)', readCount() === 1);
  ok('fetchCronHealth reports empty status for zero jobs', health.status === 'empty');
}

// 4. clearCronCache forces re-spawn
{
  clearCronCache();
  fetchCronJobs();
  ok('clearCronCache forces fresh spawn (count=2)', readCount() === 2);
}

// 5. useCache=false bypasses the cache
{
  fetchCronJobs({ useCache: false });
  ok('useCache=false bypasses cache (count=3)', readCount() === 3);
  // But the cache itself was not updated by the bypassed call — sanity:
  // calling again WITH cache should reuse the prior cached entry, not spawn.
  const before = readCount();
  fetchCronJobs();
  ok('cached entry still valid after bypassed call (no new spawn)', readCount() === before);
}

// 6. Cache key respects timeoutMs differences — different timeout → different key → spawn
{
  clearCronCache();
  fetchCronJobs({ timeoutMs: 5000 });
  fetchCronJobs({ timeoutMs: 5000 });
  const before = readCount();
  fetchCronJobs({ timeoutMs: 3000 });
  ok('different timeoutMs forces re-spawn (key mismatch)', readCount() === before + 1);
}

// 7. TTL respected
{
  clearCronCache();
  fetchCronJobs({ cacheTtlMs: 50 });
  const before = readCount();
  // Wait synchronously > 50ms
  const start = Date.now();
  while (Date.now() - start < 80) { /* spin */ }
  fetchCronJobs({ cacheTtlMs: 50 });
  ok('expired cache → re-spawn', readCount() === before + 1);
}

// 8. DEFAULT_CACHE_TTL_MS is a sane default
{
  ok('default TTL is positive', DEFAULT_CACHE_TTL_MS > 0);
  ok('default TTL is at most a few minutes', DEFAULT_CACHE_TTL_MS <= 5 * 60 * 1000);
}

console.log(JSON.stringify({ ok: true, asserted }));
