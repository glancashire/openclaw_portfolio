const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { reconcileOrderStatus, readTradesTable } = require('../src/execution/tradeState');
const { normalizeLifecycleStatus } = require('../src/execution/lifecycleStatus');

function main() {
  const fixturePath = path.resolve('/tmp/test-trades-probable-cancelled.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-11 06:33:50 | failed | buy | IE000XZSV718 | State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc) | 105 | 15.5 | 1560.83 | 0 | Replacement for CSPX after live quote-path validation in current IBKR setup.; Sized from live IBKR quote path using SPYL ask 15.4845 EUR and FX 0.96 to CHF.; Broker order status lookup returned not_found. | not_found | 9105 |\n`);

  const normalized = normalizeLifecycleStatus('broker_cancelled', { orderId: 9105, notFound: true, transmit: true });
  assert(normalized === 'cancelled', `Expected broker_cancelled lifecycle status to normalize to cancelled, got ${normalized}`);

  const reconciled = reconcileOrderStatus(
    fixturePath,
    { orderId: '9105', tickerOrIsin: 'IE000XZSV718', action: 'buy' },
    { orderId: 9105, status: 'cancelled', notFound: true, transmit: true, hintPermId: 617503611, hintSymbol: 'SPYL' },
    {
      approval: 'broker_cancelled',
      reasonNote: 'Broker order id match was unavailable, but completed-order evidence suggests cancellation (symbol SPYL, quantity 105, permId 617503611).',
    }
  );

  assert(reconciled.updated === 1, `Expected one reconciled row, got ${reconciled.updated}`);
  const row = readTradesTable(fixturePath).rows[0];
  assert(row.Status === 'cancelled', `Expected cancelled status, got ${row.Status}`);
  assert(row.Approval === 'broker_cancelled', `Expected broker_cancelled approval, got ${row.Approval}`);
  assert(String(row.Reason).includes('completed-order evidence suggests cancellation'), 'Expected probable-cancelled reconciliation note in reason');

  console.log(JSON.stringify({ ok: true, row }, null, 2));
}

main();
