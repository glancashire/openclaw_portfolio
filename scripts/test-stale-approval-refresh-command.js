const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

function writeTrades(portfolioDir) {
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-15 08:00:00 | approved | buy | AAA | ETF A | 1 | 10 | 10 | 0 | stale approved row | user_approved |  |  |  |  |  |\n| 2026-05-17 07:55:00 | proposed | buy | BBB | ETF B | 2 | 20 | 40 | 0 | fresh proposal | pending_user_approval |  |  |  |  | review |\n`);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-approval-refresh-'));
  const portfolioDir = path.join(tempDir, 'portfolio', 'etf');
  writeTrades(portfolioDir);

  const jsonRun = spawnSync('node', ['scripts/trade.js', 'refresh-stale-approvals', portfolioDir, '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.strictEqual(jsonRun.status, 2, `expected exit status 2 for stale approvals, got ${jsonRun.status}: ${jsonRun.stderr}`);
  const payload = JSON.parse(jsonRun.stdout);
  assert.strictEqual(payload.ok, true);
  assert.strictEqual(payload.mutatesTrades, false);
  assert.strictEqual(payload.staleApprovalCount, 1);
  assert(Array.isArray(payload.items), 'expected items array');
  assert(payload.items[0].reasonCode === 'stale_approval', 'expected stale approval reason code');
  assert(payload.items[0].refreshCommand.includes('node scripts/trade.js propose'), 'expected refresh command guidance');
  assert(payload.recommendedNextSteps.some((step) => /approve only the latest refreshed row/i.test(step)), 'expected explicit reapprove guidance');

  const textRun = spawnSync('node', ['scripts/trade.js', 'refresh-stale-approvals', portfolioDir], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.strictEqual(textRun.status, 2, `expected human output to exit 2 when stale approvals exist, got ${textRun.status}: ${textRun.stderr}`);
  assert(/stale approvals needing reapproval: 1/i.test(textRun.stdout), 'expected stale approval count in human output');
  assert(/mutates trades: no/i.test(textRun.stdout), 'expected non-mutating statement');
  assert(/approve only the latest refreshed row/i.test(textRun.stdout), 'expected exact safe next-step guidance');

  const noStaleDir = path.join(tempDir, 'portfolio', 'clean');
  fs.mkdirSync(noStaleDir, { recursive: true });
  fs.writeFileSync(path.join(noStaleDir, 'trades.md'), `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-17 07:55:00 | proposed | buy | BBB | ETF B | 2 | 20 | 40 | 0 | fresh proposal | pending_user_approval |  |  |  |  | review |\n`);
  const cleanRun = spawnSync('node', ['scripts/trade.js', 'refresh-stale-approvals', noStaleDir, '--json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.strictEqual(cleanRun.status, 0, `expected clean portfolio to exit 0, got ${cleanRun.status}: ${cleanRun.stderr}`);
  const cleanPayload = JSON.parse(cleanRun.stdout);
  assert.strictEqual(cleanPayload.staleApprovalCount, 0);
  assert.deepStrictEqual(cleanPayload.recommendedNextSteps, []);

  console.log(JSON.stringify({ ok: true, staleApprovalCount: payload.staleApprovalCount }, null, 2));
}

main();
