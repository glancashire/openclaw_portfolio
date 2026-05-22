'use strict';

/* Phase 204 — regression: ensure cron-job builder produces non-Docker session
 * defaults (sessionTarget=current) and announce delivery, so Phase 204 hot-fix
 * doesn't regress.
 */

const assert = require('assert');
const path = require('path');
const realRoot = path.resolve(__dirname, '..');
const { buildHealthMonitorJob } = require(path.join(realRoot, 'scripts/health-monitor-cron'));

(async () => {
  // Default build — must use current session and announce delivery.
  const job = buildHealthMonitorJob({ portfolioDir: '/tmp/etf', deliveryMode: 'announce' });
  assert.strictEqual(job.sessionTarget, 'current', 'sessionTarget must be current to avoid Docker requirement');
  assert.strictEqual(job.delivery.mode, 'announce', 'delivery.mode must be announce so failures surface');
  assert(job.payload.message.includes('--send-email'), 'payload must include --send-email');

  // Explicit override is honoured (don't break the setting if caller picks a different mode).
  const job2 = buildHealthMonitorJob({ portfolioDir: '/tmp/etf', deliveryMode: 'webhook' });
  assert.strictEqual(job2.delivery.mode, 'webhook');

  console.log(JSON.stringify({ ok: true, testsPassed: 3 }));
})().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
