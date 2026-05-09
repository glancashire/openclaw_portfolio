'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'market-open-requeue-command-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-09 09:00:00 | approved | buy | AAA | ETF A | 2 | 101 | 202 | 0 | blocked AAA | user_approved |  | trend_guard_blocked | price jumped | 2026-05-09 09:30:00 | review after open |\n| 2026-05-09 09:00:01 | submitted | buy | BBB | ETF B | 3 | 102 | 306 | 0 | submitted BBB | submitted_to_broker | 777 |  |  |  |  |\n`);

  const out = execFileSync('node', ['scripts/trade.js', 'requeue-open', portfolioDir, '--ticker', 'AAA', '--action', 'buy', '--json'], {
    cwd: '/home/ubuntu/.openclaw/workspace',
    encoding: 'utf8',
  });
  const result = JSON.parse(out);
  assert(result.ok === true, 'expected requeue-open success');
  assert(result.updated === 1, `expected one updated row, got ${result.updated}`);
  assert(result.retry === true, 'expected retry metadata');

  const updated = fs.readFileSync(path.join(portfolioDir, 'trades.md'), 'utf8');
  assert(/queued_for_open_runner/.test(updated), 'expected queued approval persisted');
  assert(/Retry at next intended market-open run after operator recovery\./.test(updated), 'expected retry next-action note persisted');

  let failed = false;
  try {
    execFileSync('node', ['scripts/trade.js', 'requeue-open', portfolioDir, '--ticker', 'BBB', '--action', 'buy'], {
      cwd: '/home/ubuntu/.openclaw/workspace',
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch {
    failed = true;
  }
  assert(failed, 'expected submitted row requeue attempt to fail');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
