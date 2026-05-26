'use strict';

/**
 * Fetch cron jobs from the gateway CLI and compute health summary.
 * Used by dashboard generators to populate the Cron Health card.
 *
 * Falls back to an empty summary on any failure so the dashboard never
 * breaks because cron data is unavailable.
 *
 * Results are cached in-process for CRON_CACHE_TTL_MS (default 30s).
 * Multiple generators in the same process (e.g.
 * generateOverviewArtifacts called 5x in a single test run) reuse the
 * first result instead of paying ~2.5s per `openclaw cron list` spawn.
 *
 * Call clearCronCache() to invalidate (used by long-running daemons or
 * tests that need fresh data).
 */

const { execSync } = require('child_process');
const { summarizeCronJobs } = require('./cronHealthCard');

const DEFAULT_CACHE_TTL_MS = 30 * 1000;

let _cache = null; // { at: number, ttl: number, key: string, jobs: array }

function _now() { return Date.now(); }

function _cacheKey({ timeoutMs }) {
  return `t=${timeoutMs}`;
}

function fetchCronJobs({ timeoutMs = 5000, cacheTtlMs = DEFAULT_CACHE_TTL_MS, useCache = true } = {}) {
  const key = _cacheKey({ timeoutMs });
  if (useCache && _cache && _cache.key === key && (_now() - _cache.at) < _cache.ttl) {
    return _cache.jobs;
  }
  let jobs;
  try {
    const stdout = execSync('openclaw cron list --json', {
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) jobs = parsed;
    else                       jobs = parsed.items || parsed.jobs || [];
  } catch (_) {
    jobs = [];
  }
  if (useCache) {
    _cache = { at: _now(), ttl: cacheTtlMs, key, jobs };
  }
  return jobs;
}

function fetchCronHealth(opts = {}) {
  const jobs = fetchCronJobs(opts);
  return summarizeCronJobs(jobs);
}

function clearCronCache() { _cache = null; }
function _peekCronCache() { return _cache ? { ...(_cache), jobs: [..._cache.jobs] } : null; }

module.exports = {
  fetchCronJobs,
  fetchCronHealth,
  clearCronCache,
  _peekCronCache,
  DEFAULT_CACHE_TTL_MS,
};
