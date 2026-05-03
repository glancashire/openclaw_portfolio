const fs = require('fs');
const path = require('path');
const { markTradeApproved, reconcileOrderStatus, readTradesTable } = require('../src/execution/tradeState');

function main() {
  const fixturePath = path.resolve(process.argv[2] || '/tmp/test-trades-e2e.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 12:00:00 | proposed | buy | LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 10 | 38.5 | 385 | 0 | initial proposal | pending_user_approval | |\n`);

  const approved = markTradeApproved(fixturePath, { dateTime: '2026-05-03 12:00:00', tickerOrIsin: 'LU0950668870' });
  const submitted = reconcileOrderStatus(fixturePath, { dateTime: '2026-05-03 12:00:00', tickerOrIsin: 'LU0950668870' }, {
    orderId: 12345,
    status: 'Submitted',
    filled: 0,
    remaining: 10,
    transmit: true,
  });
  const partial = reconcileOrderStatus(fixturePath, { orderId: '12345', tickerOrIsin: 'LU0950668870' }, {
    orderId: 12345,
    status: 'Submitted',
    filled: 4,
    remaining: 6,
    avgFillPrice: 38.4,
    lastFillPrice: 38.4,
    execId: 'fill-1',
    executedAt: '2026-05-03T12:00:05Z',
  });
  const filled = reconcileOrderStatus(fixturePath, { orderId: '12345', tickerOrIsin: 'LU0950668870' }, {
    orderId: 12345,
    status: 'Filled',
    filled: 10,
    remaining: 0,
    avgFillPrice: 38.45,
    lastFillPrice: 38.5,
    execId: 'fill-2',
    executedAt: '2026-05-03T12:00:10Z',
    estimatedValue: 384.5,
  });

  const finalRows = readTradesTable(fixturePath).rows;
  console.log(JSON.stringify({ approved, submitted, partial, filled, finalRows }, null, 2));
}

main();
