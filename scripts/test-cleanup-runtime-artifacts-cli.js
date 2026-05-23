const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

(function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cleanup-runtime-cli-'));
  writeJson(path.join(root, 'runtime', 'basket-proposals', 'etf', '.superseded', 'old.json'), {
    proposalId: 'old',
    generatedAt: '2026-05-01T00:00:00Z',
  });

  const stdout = execFileSync(process.execPath, [
    path.join(__dirname, 'cleanup-runtime-artifacts.js'),
    `--root=${root}`,
    '--portfolio=etf',
    '--dry-run',
    '--now=2026-05-23T12:30:00Z',
  ], { encoding: 'utf8' });

  const result = JSON.parse(stdout);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.dryRun, true);
  assert(result.summary.includes('runtime cleanup (dry-run) for etf'));
  assert.strictEqual(result.results[0].removed.length, 1, 'expected stale proposal reported for deletion');
  assert.strictEqual(fs.existsSync(path.join(root, 'runtime', 'basket-proposals', 'etf', '.superseded', 'old.json')), true, 'dry-run must not remove file');

  console.log(JSON.stringify({ ok: true, summary: result.summary }, null, 2));
})();
