const fs = require('fs');
const path = require('path');
const { reconcileOrderStatus, readTradesTable } = require('../src/execution/tradeState');

function main() {
  const fixturePath = path.resolve(process.argv[2] || '/tmp/test-trades-not-found.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 12:00:00 | submitted | buy | LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 10 | 38.5 | 385 | 0 | staged | submitted_to_broker | 999 |\n`);

  const reconciled = reconcileOrderStatus(
    fixturePath,
    { orderId: '999', tickerOrIsin: 'LU0950668870' },
    { orderId: 999, status: 'not_found', notFound: true },
    { reasonNote: 'Broker order status lookup returned not_found.' }
  );

  const finalRows = readTradesTable(fixturePath).rows;
  console.log(JSON.stringify({ reconciled, finalRows }, null, 2));
}

main();
