'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { queueTradeRowForOpenRunner, requeueBlockedTradeRow, readTradesTable, summarizeOpenRunnerRetryState } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'open-runner-retry-state-'));
  const tradesPath = path.join(tempDir, 'trades.md');
  fs.writeFileSync(tradesPath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-09 09:00:00 | approved | buy | AAA | ETF A | 2 | 101 | 202 | 0 | approved AAA | user_approved |  |  |  |  |  |\n| 2026-05-09 09:00:01 | approved | buy | BBB | ETF B | 3 | 102 | 306 | 0 | blocked BBB | user_approved |  | trend_guard_blocked | price jumped | 2026-05-09 09:30:00 | review after open |\n`);

  const queueResult = queueTradeRowForOpenRunner(tradesPath, { tickerOrIsin: 'AAA', action: 'buy' });
  assert(queueResult.updated === 1, 'expected initial queue to update one row');

  const requeueResult = requeueBlockedTradeRow(tradesPath, { tickerOrIsin: 'BBB', action: 'buy' });
  assert(requeueResult.updated === 1, 'expected blocked requeue to update one row');

  const rows = readTradesTable(tradesPath).rows;
  assert(rows[0]['Next action'] === 'First open-runner attempt pending.', `unexpected initial next action: ${rows[0]['Next action']}`);
  assert(/retry/i.test(rows[1]['Next action']), `expected retry next action, got ${rows[1]['Next action']}`);

  const summary = summarizeOpenRunnerRetryState(tradesPath);
  assert(summary.queuedInitial === 1, `expected one initial queue, got ${summary.queuedInitial}`);
  assert(summary.queuedRetry === 1, `expected one queued retry, got ${summary.queuedRetry}`);

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

main();
