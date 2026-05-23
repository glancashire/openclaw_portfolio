'use strict';

/**
 * Fetch cron jobs from the gateway CLI and compute health summary.
 * Used by dashboard generators to populate the Cron Health card.
 *
 * Falls back to an empty summary on any failure so the dashboard never
 * breaks because cron data is unavailable.
 */

const { execSync } = require('child_process');
const { summarizeCronJobs } = require('./cronHealthCard');

function fetchCronJobs({ timeoutMs = 5000 } = {}) {
  try {
    const stdout = execSync('openclaw cron list --json', {
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) return parsed;
    return parsed.items || parsed.jobs || [];
  } catch (_) {
    return [];
  }
}

function fetchCronHealth(opts = {}) {
  const jobs = fetchCronJobs(opts);
  return summarizeCronJobs(jobs);
}

module.exports = { fetchCronJobs, fetchCronHealth };
