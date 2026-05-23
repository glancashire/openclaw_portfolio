const assert = require('assert');
const { formatDurationMs, summarizeResults } = require('../src/reporting/verificationRunner');

(function main() {
  assert.strictEqual(formatDurationMs(42), '42ms', 'Expected ms formatting for short duration');
  assert.strictEqual(formatDurationMs(1500), '1.5s', 'Expected seconds formatting');
  assert.strictEqual(formatDurationMs(65000), '1.1m', 'Expected minute formatting');

  const summary = summarizeResults([
    { name: 'alpha', ok: true, durationMs: 42 },
    { name: 'beta', ok: true, durationMs: 1500 },
  ]);

  assert.strictEqual(summary.ok, true, 'Expected ok summary');
  assert.strictEqual(summary.checkCount, 2, 'Expected check count');
  assert.strictEqual(summary.totalDurationMs, 1542, 'Expected accumulated duration');
  assert.strictEqual(summary.totalDuration, '1.5s', 'Expected formatted total duration');
  assert.deepStrictEqual(summary.checks, [
    { name: 'alpha', ok: true, durationMs: 42, duration: '42ms' },
    { name: 'beta', ok: true, durationMs: 1500, duration: '1.5s' },
  ], 'Expected normalized per-check summary');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
