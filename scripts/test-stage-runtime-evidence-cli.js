const assert = require('assert');
const { execFileSync } = require('child_process');
const { listRuntimeEvidencePaths } = require('../src/reporting/runtimeEvidence');

(function main() {
  const output = execFileSync('node', ['scripts/stage-runtime-evidence.js'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const lines = output.trim().split(/\n/);
  const jsonStart = lines.findIndex((line) => line.trim().startsWith('{'));
  assert(jsonStart >= 0, 'Expected JSON summary output from stage helper');
  const summary = JSON.parse(lines.slice(jsonStart).join('\n'));
  assert.strictEqual(summary.ok, true, 'Expected ok summary');
  assert.strictEqual(summary.stagedCount, listRuntimeEvidencePaths().length, 'Expected staged count to match whitelist');
  assert.deepStrictEqual(summary.paths, listRuntimeEvidencePaths(), 'Expected helper to stage only whitelisted runtime evidence paths');

  const staged = execFileSync('git', ['diff', '--cached', '--name-only'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim().split(/\n/).filter(Boolean);

  assert(staged.includes('runtime/overview/index.html'), 'Expected runtime overview file staged');
  assert(!staged.includes('runtime/events/runtime-events.jsonl'), 'Did not expect runtime events churn staged');
  assert(!staged.includes('runtime/execution-state.json'), 'Did not expect execution state churn staged');

  execFileSync('git', ['reset', '--', ...listRuntimeEvidencePaths()], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  console.log(JSON.stringify({ ok: true, stagedCount: staged.length }, null, 2));
})();
