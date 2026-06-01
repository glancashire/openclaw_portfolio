#!/usr/bin/env node
'use strict';

/* Phase Cleanup-1F regression: cron delivery posture.
 *
 * Asserts:
 * - Every announce-mode job carries delivery.bestEffort=true so
 *   delivery-layer failures don't dirty consecutiveErrors.
 * - No job is in 'error' state.
 * - No job has consecutiveErrors > 0.
 *
 * Skips cleanly when the daemon is unreachable (e.g. CI without OpenClaw).
 */

const assert = require('assert');
const { execSync } = require('child_process');

let payload = null;
try {
  const out = execSync('openclaw cron list --json', { encoding: 'utf8', timeout: 30000 });
  payload = JSON.parse(out);
} catch (err) {
  // Daemon unreachable, CLI missing, etc. Don't fail the suite.
  console.log(JSON.stringify({ ok: true, skipped: true, reason: 'cron-list-unavailable', detail: String(err?.message || err).slice(0, 200) }, null, 2));
  process.exit(0);
}

assert(payload && Array.isArray(payload.jobs), 'cron list payload missing jobs array');

const jobs = payload.jobs;

const offenders = {
  missingBestEffort: [],
  errorState: [],
  consecutiveErrors: [],
};

for (const job of jobs) {
  const announceMode = String(job?.delivery?.mode || '') === 'announce';
  if (announceMode && job?.delivery?.bestEffort !== true) {
    offenders.missingBestEffort.push(job.name || job.id);
  }
  const status = String(job?.status || '').toLowerCase();
  if (status === 'error') {
    offenders.errorState.push(job.name || job.id);
  }
  const consec = Number(job?.state?.consecutiveErrors || 0);
  if (Number.isFinite(consec) && consec > 0) {
    offenders.consecutiveErrors.push(`${job.name || job.id}:${consec}`);
  }
}

assert.deepStrictEqual(offenders.missingBestEffort, [], `Announce-mode jobs without bestEffort:true: ${JSON.stringify(offenders.missingBestEffort)}. Set delivery.bestEffort:true on each.`);
assert.deepStrictEqual(offenders.errorState, [], `Cron jobs in error state: ${JSON.stringify(offenders.errorState)}.`);
assert.deepStrictEqual(offenders.consecutiveErrors, [], `Cron jobs with consecutiveErrors > 0: ${JSON.stringify(offenders.consecutiveErrors)}.`);

console.log(JSON.stringify({
  ok: true,
  jobsChecked: jobs.length,
  announceJobs: jobs.filter((j) => j?.delivery?.mode === 'announce').length,
}, null, 2));
