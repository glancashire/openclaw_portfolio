const assert = require('assert');
const path = require('path');
const { buildHealthMonitorJob, parseArgs } = require('./health-monitor-cron');

(function main() {
  const job = buildHealthMonitorJob({ portfolioDir: 'portfolio/etf' });
  assert.strictEqual(job.name, 'portfolio-health-monitor-etf');
  assert.strictEqual(job.schedule.kind, 'cron');
  assert.strictEqual(job.schedule.expr, '0 8,14,20 * * *');
  assert.strictEqual(job.schedule.tz, 'UTC');
  assert.strictEqual(job.payload.kind, 'agentTurn');
  assert.strictEqual(job.sessionTarget, 'current');
  assert.strictEqual(job.delivery.mode, 'announce');
  assert(job.payload.message.includes(path.resolve('portfolio/etf')));
  assert(job.payload.message.includes('run-health-check.js'));

  const parsed = parseArgs(['payload', 'portfolio/etf', '--expr', '0 6 * * *', '--tz', 'Europe/Zurich', '--delivery', 'announce']);
  assert.strictEqual(parsed.action, 'payload');
  assert.strictEqual(parsed.portfolioDir, 'portfolio/etf');
  assert.strictEqual(parsed.scheduleExpr, '0 6 * * *');
  assert.strictEqual(parsed.tz, 'Europe/Zurich');
  assert.strictEqual(parsed.deliveryMode, 'announce');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
