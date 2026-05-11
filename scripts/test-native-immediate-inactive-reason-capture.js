const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { reconcileOrderStatus, readTradesTable } = require('../src/execution/tradeState');
const source = fs.readFileSync(path.resolve(process.cwd(), 'src/brokers/interactive-brokers/nativeClient.js'), 'utf8');

function main() {
  assert(source.includes('const WAIT_FOR_POST_ACK_MS = 2500;'), 'expected short post-ack native wait window');
  assert(source.includes("brokerReason: 'broker_error'"), 'expected native broker error classification for order-scoped errors');
  assert(source.includes('brokerErrorCode: code ?? null'), 'expected broker error code capture');
  assert(source.includes('brokerErrorMessage: normalizeError(err, code, reqId).message'), 'expected broker error message capture');

  const fixturePath = path.resolve('/tmp/test-trades-native-immediate-inactive.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-11 09:40:00 | submitted | buy | IE000XZSV718 | State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc) | 105 | 15.5 | 1560.83 | 0 | live submit | submitted_to_broker | 9105 |\n`);

  const reconciled = reconcileOrderStatus(
    fixturePath,
    { orderId: '9105', tickerOrIsin: 'IE000XZSV718', action: 'buy' },
    {
      orderId: 9105,
      status: 'Inactive',
      transmit: true,
      brokerReason: 'broker_error',
      brokerErrorCode: 201,
      brokerErrorMessage: 'IB native error 201 reqId=9105: Order rejected - exchange is closed',
    }
  );

  assert.strictEqual(reconciled.updated, 1, 'expected one reconciled row');
  const row = readTradesTable(fixturePath).rows[0];
  assert.strictEqual(row.Status, 'inactive', 'expected inactive status');
  assert.strictEqual(row.Approval, 'broker_inactive', 'expected broker_inactive approval');
  assert(/broker error code 201/i.test(String(row.Reason)), 'expected broker error code in reason');
  assert(/exchange is closed/i.test(String(row.Reason)), 'expected broker error message in reason');

  console.log(JSON.stringify({ ok: true, row }, null, 2));
}

main();
