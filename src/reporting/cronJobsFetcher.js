'use strict';

/**
 * Fetch cron jobs from the gateway CLI and compute health summary.
 * Used by dashboard generators to populate the Cron Health card.
 *
 * Falls back to an explicit unavailable status on any failure so the dashboard
 * never breaks and operator-facing surfaces can distinguish "no jobs" from
 * "cron inspection failed".
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

let _cache = null; // { at: number, ttl: number, key: string, result: object }

function _now() { return Date.now(); }

function _cacheKey({ timeoutMs }) {
  return `t=${timeoutMs}`;
}

function fetchCronJobs({ timeoutMs = 5000, cacheTtlMs = DEFAULT_CACHE_TTL_MS, useCache = true } = {}) {
  const key = _cacheKey({ timeoutMs });
  if (useCache && _cache && _cache.key === key && (_now() - _cache.at) < _cache.ttl) {
    return _cache.result;
  }
  let result;
  try {
    const stdout = execSync('openclaw cron list --json', {
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(stdout);
    const jobs = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.items)
        ? parsed.items
        : Array.isArray(parsed.jobs)
          ? parsed.jobs
          : [];
    result = {
      ok: true,
      status: 'ok',
      jobs,
      reason: null,
      message: jobs.length ? null : 'No enabled cron jobs found.',
    };
  } catch (error) {
    result = {
      ok: false,
      status: 'unavailable',
      jobs: [],
      reason: error instanceof SyntaxError ? 'invalid_json' : 'command_failed',
      message: 'Cron inspection unavailable.',
    };
  }
  if (useCache) {
    _cache = { at: _now(), ttl: cacheTtlMs, key, result };
  }
  return result;
}

function fetchCronHealth(opts = {}) {
  const result = fetchCronJobs(opts);
  return summarizeCronJobs(result.jobs, {
    sourceStatus: result.status,
    sourceMessage: result.message,
  });
}

function clearCronCache() { _cache = null; }
function _peekCronCache() { return _cache ? { ..._cache, result: { ..._cache.result, jobs: [..._cache.result.jobs] } } : null; }

module.exports = {
  fetchCronJobs,
  fetchCronHealth,
  clearCronCache,
  _peekCronCache,
  DEFAULT_CACHE_TTL_MS,
};
