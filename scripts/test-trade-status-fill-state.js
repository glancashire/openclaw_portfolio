const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function copyDir(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const srcPath = path.join(source, entry.name);
    const dstPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, dstPath);
    else fs.copyFileSync(srcPath, dstPath);
  }
}

(function main() {
  const workspaceRoot = process.cwd();
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'trade-status-fill-state-'));
  copyDir(path.join(workspaceRoot, 'scripts'), path.join(repoRoot, 'scripts'));
  copyDir(path.join(workspaceRoot, 'src'), path.join(repoRoot, 'src'));
  copyDir(path.join(workspaceRoot, 'lib'), path.join(repoRoot, 'lib'));
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'portfolio', 'etf'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'portfolio', 'etf', 'trades.md'), '# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n');
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({
    notifiedFills: [9101],
    reconciledUnnotifiedFills: [9102],
    acknowledgedBackfilledFills: [9103],
  }, null, 2));

  const output = execFileSync('node', ['scripts/trade.js', 'status', 'portfolio/etf', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env },
  });

  const parsed = JSON.parse(output);
  assert.deepStrictEqual(parsed.notifiedFills, [9101]);
  assert.deepStrictEqual(parsed.reconciledUnnotifiedFills, [9102]);
  assert.deepStrictEqual(parsed.acknowledgedBackfilledFills, [9103]);
  assert(parsed.openRunnerRetryState, 'expected openRunnerRetryState');
  console.log(JSON.stringify({ ok: true }, null, 2));
})();
