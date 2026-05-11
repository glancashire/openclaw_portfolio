const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { reconcileOrderStatus, readTradesTable } = require('../src/execution/tradeState');
const { normalizeLifecycleStatus } = require('../src/execution/lifecycleStatus');

function main() {
  const fixturePath = path.resolve('/tmp/test-trades-inactive.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 12:00:00 | submitted | buy | IE000XZSV718 | State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc) | 10 | 15.5 | 155 | 0 | live submit | submitted_to_broker | 9105 |\n`);

  const normalized = normalizeLifecycleStatus('Inactive', { orderId: 9105, transmit: true });
  assert(normalized === 'inactive', `Expected inactive lifecycle status, got ${normalized}`);

  const reconciled = reconcileOrderStatus(
    fixturePath,
    { orderId: '9105', tickerOrIsin: 'IE000XZSV718', action: 'buy' },
    { orderId: 9105, status: 'Inactive', transmit: true },
    { reasonNote: 'Broker order acknowledged but marked Inactive.' }
  );

  assert(reconciled.updated === 1, `Expected one reconciled row, got ${reconciled.updated}`);
  const row = readTradesTable(fixturePath).rows[0];
  assert(row.Status === 'inactive', `Expected inactive status, got ${row.Status}`);
  assert(row.Approval === 'broker_inactive', `Expected broker_inactive approval, got ${row.Approval}`);
  assert(String(row.Reason).includes('Broker order acknowledged but marked Inactive.'), 'Expected inactive reconciliation note in reason');

  console.log(JSON.stringify({ ok: true, row }, null, 2));
}

main();
