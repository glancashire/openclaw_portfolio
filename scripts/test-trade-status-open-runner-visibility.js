'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trade-status-open-runner-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-09 09:00:00 | approved | buy | AAA | ETF A | 2 | 101 | 202 | 0 | first handoff AAA | queued_for_open_runner |  |  |  |  | First open-runner attempt pending. |\n| 2026-05-09 09:00:01 | approved | buy | BBB | ETF B | 3 | 102 | 306 | 0 | retry BBB | queued_for_open_runner |  |  |  |  | Retry at next intended market-open run after operator recovery. |\n`);

  const jsonOut = execFileSync('node', ['scripts/trade.js', 'status', portfolioDir, '--json'], {
    cwd: '/home/ubuntu/.openclaw/workspace',
    encoding: 'utf8',
  });
  const payload = JSON.parse(jsonOut);
  assert(payload.openRunnerRetryState, 'expected open-runner retry state in status json');
  assert(payload.openRunnerRetryState.queuedInitial === 1, `expected one first-handoff row, got ${payload.openRunnerRetryState.queuedInitial}`);
  assert(payload.openRunnerRetryState.queuedRetry === 1, `expected one retry row, got ${payload.openRunnerRetryState.queuedRetry}`);

  const textOut = execFileSync('node', ['scripts/trade.js', 'status', portfolioDir], {
    cwd: '/home/ubuntu/.openclaw/workspace',
    encoding: 'utf8',
  });
  assert(/Open-runner queue: 1 first handoff, 1 retry/i.test(textOut), 'expected open-runner queue summary in text status');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
