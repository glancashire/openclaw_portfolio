'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { listExecutableTradeRows, classifyExecutableRow, readTradesTable } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'market-open-row-selection-'));
  const tradesPath = path.join(tempDir, 'trades.md');
  fs.writeFileSync(tradesPath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-09 09:00:00 | approved | buy | AAA | ETF A | 2 | 101 | 202 | 0 | approved AAA | user_approved |  |  |  |  |  |\n| 2026-05-09 09:00:01 | proposed | buy | BBB | ETF B | 3 | 102 | 306 | 0 | queued BBB | queued_for_open_runner |  |  |  |  |  |\n| 2026-05-09 09:00:02 | approved | hold | CASH-CHF | Cash | 0 | 0 | 1000 | 0 | hold cash | user_approved |  |  |  |  |  |\n| 2026-05-09 09:00:03 | approved | buy | CCC | ETF C | 1 | 103 | 103 | 0 | blocked CCC | user_approved |  | approval_required | blocked | 2026-05-09 09:00:03 | approve first |\n| 2026-05-09 09:00:04 | approved | buy | DDD | ETF D | 1 | 104 | 104 | 0 | already submitted DDD | user_approved | 999 |  |  |  |  |\n`);

  const rows = listExecutableTradeRows(tradesPath);
  assert(rows.length === 2, `expected exactly two executable rows, got ${rows.length}`);
  assert(rows.some((row) => row.tickerOrIsin === 'AAA'), 'expected AAA selected');
  assert(rows.some((row) => row.tickerOrIsin === 'BBB'), 'expected queued BBB selected');

  const table = readTradesTable(tradesPath);
  const blocked = table.rows.find((row) => row['Ticker / ISIN'] === 'CCC');
  const blockedClassification = classifyExecutableRow(blocked);
  assert(blockedClassification.executable === false, 'expected blocked CCC row to be non-executable');
  assert(blockedClassification.reasonCode === 'approval_required', `expected approval_required reason code, got ${blockedClassification.reasonCode}`);
  assert(/blocked/i.test(blockedClassification.reason), 'expected blocked row reason text');

  console.log(JSON.stringify({ ok: true, rows, blockedClassification }, null, 2));
}

main();
