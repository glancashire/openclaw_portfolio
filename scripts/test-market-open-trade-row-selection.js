'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { listExecutableTradeRows } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'market-open-row-selection-'));
  const tradesPath = path.join(tempDir, 'trades.md');
  fs.writeFileSync(tradesPath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-09 09:00:00 | approved | buy | AAA | ETF A | 2 | 101 | 202 | 0 | approved AAA | user_approved |  |  |  |  |  |\n| 2026-05-09 09:00:01 | proposed | buy | BBB | ETF B | 3 | 102 | 306 | 0 | proposed BBB | pending_user_approval |  |  |  |  |  |\n| 2026-05-09 09:00:02 | approved | hold | CASH-CHF | Cash | 0 | 0 | 1000 | 0 | hold cash | user_approved |  |  |  |  |  |\n| 2026-05-09 09:00:03 | approved | buy | CCC | ETF C | 1 | 103 | 103 | 0 | blocked CCC | user_approved |  | approval_required | blocked | 2026-05-09 09:00:03 | approve first |\n| 2026-05-09 09:00:04 | approved | buy | DDD | ETF D | 1 | 104 | 104 | 0 | already submitted DDD | user_approved | 999 |  |  |  |  |\n`);

  const rows = listExecutableTradeRows(tradesPath);
  assert(rows.length === 1, `expected exactly one executable row, got ${rows.length}`);
  assert(rows[0].tickerOrIsin === 'AAA', `expected AAA selected, got ${rows[0].tickerOrIsin}`);
  console.log(JSON.stringify({ ok: true, rows }, null, 2));
}

main();
