'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { readRuntimeEvents, EVENTS_PATH } = require('../src/observability/runtimeEvents');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const eventsBefore = fs.existsSync(EVENTS_PATH) ? fs.readFileSync(EVENTS_PATH, 'utf8') : null;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'market-open-queue-command-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-09 09:00:00 | approved | buy | AAA | ETF A | 2 | 101 | 202 | 0 | approved AAA | user_approved |  |  |  |  |  |\n| 2026-05-09 09:00:01 | submitted | buy | BBB | ETF B | 3 | 102 | 306 | 0 | submitted BBB | submitted_to_broker | 777 |  |  |  |  |\n`);

  const out = execFileSync('node', ['scripts/trade.js', 'queue-open', portfolioDir, '--ticker', 'AAA', '--action', 'buy', '--json'], {
    cwd: '/home/ubuntu/.openclaw/workspace',
    encoding: 'utf8',
  });
  const result = JSON.parse(out);
  assert(result.ok === true, 'expected queue-open success');
  assert(result.updated === 1, `expected one updated row, got ${result.updated}`);

  const updated = fs.readFileSync(path.join(portfolioDir, 'trades.md'), 'utf8');
  assert(/queued_for_open_runner/.test(updated), 'expected queued approval persisted');
  assert(/First open-runner attempt pending\./.test(updated), 'expected initial queue next-action note persisted');

  const queueEvents = readRuntimeEvents({ portfolio: 'portfolio', limit: 20 }).filter((event) => event.action === 'queue_open_runner');
  assert(queueEvents.some((event) => /first handoff/i.test(event.summary)), 'expected first-handoff runtime event');
  assert(queueEvents.some((event) => event.details && event.details.retry === false), 'expected non-retry runtime-event details');

  let failed = false;
  try {
    execFileSync('node', ['scripts/trade.js', 'queue-open', portfolioDir, '--ticker', 'BBB', '--action', 'buy'], {
      cwd: '/home/ubuntu/.openclaw/workspace',
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch {
    failed = true;
  }
  assert(failed, 'expected submitted row queue attempt to fail');

  if (eventsBefore == null) {
    if (fs.existsSync(EVENTS_PATH)) fs.unlinkSync(EVENTS_PATH);
  } else {
    fs.writeFileSync(EVENTS_PATH, eventsBefore);
  }

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
