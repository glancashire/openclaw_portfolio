'use strict';

/**
 * Run all trading infrastructure tests and report summary.
 */

const { execSync } = require('child_process');
const path = require('path');

const TESTS = [
  'tests/test-marketHours.js',
  'tests/test-etfQualityFilter.js',
  'tests/test-tradeNotificationEmail.js',
  'tests/test-tradeExecutionNotifier.js',
  'tests/test-monitorFills.js',
  'scripts/test-trading-guards.js',
];

const ROOT = path.join(__dirname, '..');
let totalPassed = 0;
let totalFailed = 0;
const results = [];

console.log('╔══════════════════════════════════════════════╗');
console.log('║   Trading Infrastructure Test Suite          ║');
console.log('╚══════════════════════════════════════════════╝\n');

for (const test of TESTS) {
  const label = path.basename(test, '.js');
  try {
    const output = execSync(`node ${test}`, { encoding: 'utf8', cwd: ROOT, timeout: 30000 });
    const match = output.match(/(\d+) passed, (\d+) failed/);
    const p = match ? parseInt(match[1]) : 0;
    const f = match ? parseInt(match[2]) : 0;
    totalPassed += p;
    totalFailed += f;
    results.push({ label, passed: p, failed: f, status: f === 0 ? '✓' : '✗' });
    if (f > 0) console.log(output);
  } catch (e) {
    const output = e.stdout || e.stderr || '';
    const match = output.match(/(\d+) passed, (\d+) failed/);
    const p = match ? parseInt(match[1]) : 0;
    const f = match ? parseInt(match[2]) : 1;
    totalPassed += p;
    totalFailed += f;
    results.push({ label, passed: p, failed: f, status: '✗' });
    console.log(`FAILED: ${label}\n${output}\n`);
  }
}

console.log('\n┌──────────────────────────────────────────────┐');
console.log('│ Summary                                      │');
console.log('├──────────────────────────────────────────────┤');
for (const r of results) {
  const line = `│ ${r.status} ${r.label.padEnd(35)} ${String(r.passed).padStart(3)}/${String(r.passed + r.failed).padStart(3)} │`;
  console.log(line);
}
console.log('├──────────────────────────────────────────────┤');
console.log(`│ Total: ${totalPassed} passed, ${totalFailed} failed${' '.repeat(22 - String(totalPassed).length - String(totalFailed).length)}│`);
console.log('└──────────────────────────────────────────────┘');

process.exit(totalFailed > 0 ? 1 : 0);
