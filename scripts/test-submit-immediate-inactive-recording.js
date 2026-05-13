const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { reconcileOrderStatus } = require('../src/execution/tradeState');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'submit-inactive-'));
const tradesPath = path.join(dir, 'trades.md');
fs.writeFileSync(tradesPath, `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-13 13:29:24 | approved | buy | IE000XZSV718 | SPYL | 119 | 15.61 | 1784.31 | 0 | proposal | user_approved |  |  |  |  |  |\n`);

const result = reconcileOrderStatus(
  tradesPath,
  { dateTime: '2026-05-13 13:29:24', tickerOrIsin: 'IE000XZSV718', action: 'buy' },
  {
    orderId: 9105,
    status: 'Inactive',
    transmit: true,
    brokerReason: 'broker_error',
    brokerErrorCode: 201,
    brokerErrorMessage: 'IB native error 201 reqId=9105: Order rejected - exchange is closed',
  },
  { reasonNote: 'Broker order acknowledged but marked Inactive.' }
);

assert.strictEqual(result.updated, 1, 'expected one updated row');
const text = fs.readFileSync(tradesPath, 'utf8');
assert(/\| inactive \|/.test(text), 'expected inactive status');
assert(/\| broker_inactive \|/.test(text), 'expected broker_inactive approval');
assert(/exchange_closed_at_submit/.test(text), 'expected exchange-closed block code');
assert(/Broker rejected the order because the target exchange was closed at submission time\./.test(text), 'expected exchange-closed block reason');
assert(/Broker order acknowledged but marked Inactive\./.test(text), 'expected inactive acknowledgement note');
const submitSource = fs.readFileSync(path.resolve(__dirname, 'submit-orders-at-open.js'), 'utf8');
assert(submitSource.includes('Broker order acknowledged but marked Inactive.'), 'expected submit path inactive note');
assert(submitSource.includes('result.order?.brokerErrorMessage'), 'expected submit path to preserve broker error payload');
console.log(JSON.stringify({ ok: true }, null, 2));
