/**
 * Regression: execute-trades.js shim contract.
 *
 * Locks in:
 *  - exits with code 1 when invoked
 *  - prints an obsolescence notice that points operators to the real CLIs
 *  - the file is kept deliberately (does not delete itself or get retired)
 *
 * Background: scripts/execute-trades.js is a deliberate failure shim.
 * It must not be removed. See docs/operations/wrappers-and-shims.md.
 */

const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

(function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const shimPath = path.join(repoRoot, 'scripts', 'execute-trades.js');
  assert(fs.existsSync(shimPath), 'execute-trades.js shim must exist');

  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  try {
    execFileSync(process.execPath, [shimPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    exitCode = err.status;
    stdout = err.stdout || '';
    stderr = err.stderr || '';
  }

  assert.strictEqual(exitCode, 1, `expected exit code 1, got ${exitCode}`);
  const combined = `${stdout}\n${stderr}`;
  assert(combined.includes('obsolete'), 'shim must mention "obsolete"');
  assert(
    combined.includes('submit-orders-at-open') || combined.includes('trade.js'),
    'shim must point at active CLI'
  );

  // The shim must remain in source control (no self-delete).
  const source = fs.readFileSync(shimPath, 'utf8');
  assert(source.includes('Deliberate failure shim'), 'shim must keep its rationale block');
  assert(source.includes('process.exit(1)'), 'shim must keep its exit-1 contract');

  console.log(JSON.stringify({ ok: true, exitCode, hasObsoleteNotice: true }, null, 2));
})();
