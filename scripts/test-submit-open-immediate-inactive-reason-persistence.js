const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { reconcileOrderStatus } = require('../src/execution/tradeState');

(function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'submit-open-inactive-'));
  const tradesPath = path.join(dir, 'trades.md');
  fs.writeFileSync(tradesPath, `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-21 09:06:21 | approved | buy | IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | 8 | 122.845 | 984.28 | 0 | Controlled live diagnostic retry under instrumented native IBKR reject-capture path after fresh explicit operator approval. | queued_for_open_runner |  |  |  |  | First open-runner attempt pending. |\n`);

  const result = reconcileOrderStatus(
    tradesPath,
    { dateTime: '2026-05-21 09:06:21', tickerOrIsin: 'IE00BD4TXW66', action: 'buy' },
    {
      orderId: 9120,
      status: 'Inactive',
      transmit: true,
      brokerReason: 'broker_error',
      brokerErrorCode: 321,
      brokerErrorMessage: 'IB native error 321 reqId=9120: Order rejected - hypothetical persisted reject',
    },
    { reasonNote: 'Broker order acknowledged but marked Inactive. IB native error 321 reqId=9120: Order rejected - hypothetical persisted reject' }
  );

  assert.strictEqual(result.updated, 1, 'expected one updated row');
  const text = fs.readFileSync(tradesPath, 'utf8');
  assert(text.includes('hypothetical persisted reject'), 'expected broker error message to be persisted in reason');
  assert(text.includes('broker_submit_rejected') || text.includes('Broker rejected or inactivated the order'), 'expected block classification from broker reject text');
  console.log(JSON.stringify({ ok: true }, null, 2));
})();
