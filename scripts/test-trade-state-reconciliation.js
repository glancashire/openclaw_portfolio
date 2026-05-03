const fs = require('fs');
const path = require('path');
const { markTradeApproved, reconcileOrderStatus, readTradesTable } = require('../src/execution/tradeState');

function main() {
  const fixturePath = path.resolve(process.argv[2] || '/tmp/test-trades.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 12:00:00 | proposed | buy | LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 10 | 38.5 | 385 | 0 | initial proposal | pending_user_approval | |\n`);

  const approved = markTradeApproved(fixturePath, { dateTime: '2026-05-03 12:00:00', tickerOrIsin: 'LU0950668870' });
  const reconciled = reconcileOrderStatus(fixturePath, { dateTime: '2026-05-03 12:00:00', tickerOrIsin: 'LU0950668870' }, {
    orderId: 12345,
    status: 'Filled',
    filled: 10,
    remaining: 0,
    avgFillPrice: 38.4,
    estimatedValue: 384,
    transmit: false,
  });

  const finalRows = readTradesTable(fixturePath).rows;
  console.log(JSON.stringify({ approved, reconciled, finalRows }, null, 2));
}

main();
