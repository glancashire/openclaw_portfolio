const fs = require('fs');
const path = require('path');
const { reconcileOrderStatus, readTradesTable } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const fixturePath = path.resolve(process.argv[2] || '/tmp/test-partial-fill-status-inference.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 12:00:00 | submitted | buy | LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 10 | 38.5 | 385 | 0 | staged | submitted_to_broker | 12345 |\n`);

  const reconciled = reconcileOrderStatus(fixturePath, { orderId: '12345', tickerOrIsin: 'LU0950668870' }, {
    orderId: 12345,
    status: 'Submitted',
    filled: 4,
    remaining: 6,
    avgFillPrice: 38.4,
    lastFillPrice: 38.4,
    execId: 'fill-1',
    executedAt: '2026-05-03T12:00:05Z',
  });

  const finalRow = readTradesTable(fixturePath).rows[0];
  assert(reconciled.updated === 1, 'Expected one trade row to be reconciled.');
  assert(finalRow.Status === 'partially_filled', `Expected status partially_filled, got ${finalRow.Status}`);
  assert(finalRow.Approval === 'broker_filled', `Expected approval broker_filled, got ${finalRow.Approval}`);
  assert(finalRow['Actual CHF'] === '153.6', `Expected Actual CHF 153.6, got ${finalRow['Actual CHF']}`);
  assert(finalRow.Reason.includes('filled 4'), 'Expected reason to include filled quantity note.');

  console.log(JSON.stringify({ reconciled, finalRow }, null, 2));
}

main();
