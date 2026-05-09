'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { listExecutableTradeRows, readTradesTable, requeueBlockedTradeRow } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blocked-row-recovery-'));
  const tradesPath = path.join(tempDir, 'trades.md');
  fs.writeFileSync(tradesPath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-09 09:00:00 | approved | buy | AAA | ETF A | 2 | 101 | 202 | 0 | blocked AAA | user_approved |  | trend_guard_blocked | price jumped | 2026-05-09 09:30:00 | review after open |\n| 2026-05-09 09:00:01 | submitted | buy | BBB | ETF B | 3 | 102 | 306 | 0 | submitted BBB | submitted_to_broker | 777 |  |  |  |  |\n`);

  let rows = listExecutableTradeRows(tradesPath);
  assert(rows.length === 0, `expected no executable rows before recovery, got ${rows.length}`);

  const result = requeueBlockedTradeRow(tradesPath, { tickerOrIsin: 'AAA', action: 'buy' }, { approval: 'queued_for_open_runner' });
  assert(result.updated === 1, `expected one row requeued, got ${result.updated}`);

  rows = listExecutableTradeRows(tradesPath);
  assert(rows.length === 1, `expected one executable row after recovery, got ${rows.length}`);
  assert(rows[0].tickerOrIsin === 'AAA', `expected AAA requeued, got ${rows[0].tickerOrIsin}`);
  assert(rows[0].approval === 'queued_for_open_runner', `expected queued approval, got ${rows[0].approval}`);

  const table = readTradesTable(tradesPath).rows;
  assert(table[0]['Block code'] === '', 'expected block code cleared');
  assert(table[0]['Block reason'] === '', 'expected block reason cleared');
  assert(table[0]['Blocked at'] === '', 'expected blocked at cleared');
  assert(table[0]['Next action'] === '', 'expected next action cleared');

  const submittedResult = requeueBlockedTradeRow(tradesPath, { tickerOrIsin: 'BBB', action: 'buy' }, { approval: 'queued_for_open_runner' });
  assert(submittedResult.updated === 0, 'expected submitted row not to be requeued');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
