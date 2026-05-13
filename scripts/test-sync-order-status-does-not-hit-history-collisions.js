const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { reconcileOrderStatus } = require('../src/execution/tradeState');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-collision-'));
const tradesPath = path.join(dir, 'trades.md');
fs.writeFileSync(tradesPath, `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-11 06:33:50 | filled | buy | LU0950668870 | EMUAA | 26 | 39.905 | 970.82 | 1035.08 | old row | broker_filled | 9107 |  |  |  |  |\n| 2026-05-13 13:29:24 | submitted | buy | LU0950668870 | EMUAA | 23 | 39.465 | 872.82 | 0 | fresh row | submitted_to_broker | 9107 |  |  |  |  |\n`);

const result = reconcileOrderStatus(
  tradesPath,
  { dateTime: '2026-05-13 13:29:24', tickerOrIsin: 'LU0950668870', action: 'buy', orderId: 9107 },
  { orderId: 9107, status: 'Inactive', transmit: true, brokerReason: 'broker_error', brokerErrorCode: 201, brokerErrorMessage: 'IB native error 201 reqId=9107: Order rejected - exchange is closed' },
  { reasonNote: 'Broker order acknowledged but marked Inactive.' }
);

assert.strictEqual(result.updated, 1, 'expected only one row updated');
const lines = fs.readFileSync(tradesPath, 'utf8').split(/\r?\n/).filter((line) => line.startsWith('| 2026-'));
assert(/\| filled \|/.test(lines[0]), 'expected historical row to remain filled');
assert(/\| inactive \|/.test(lines[1]), 'expected latest row to be inactive');
console.log(JSON.stringify({ ok: true }, null, 2));
