const assert = require('assert');
const { execFileSync } = require('child_process');

(function main() {
  const output = execFileSync('node', ['scripts/check-health-monitor-cron.js', 'portfolio/etf', '--expr', '0 6 * * *', '--tz', 'Europe/Zurich'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const parsed = JSON.parse(output);
  assert.strictEqual(parsed.portfolio, 'etf');
  assert.strictEqual(parsed.expectedJobName, 'portfolio-health-monitor-etf');
  assert.strictEqual(parsed.schedule.expr, '0 6 * * *');
  assert.strictEqual(parsed.schedule.tz, 'Europe/Zurich');
  assert(parsed.payloadPreview.includes('run-health-check.js'));
  console.log(JSON.stringify({ ok: true }, null, 2));
})();
