const fs = require('fs');
const path = require('path');
const { listOpenBrokerOrderRows } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const fixturePath = path.resolve(process.argv[2] || '/tmp/test-resync-idempotent-open-order-filter.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 10:00:00 | approved | buy | AAA | ETF A | 1 | 100 | 100 | 0 | approved row | user_approved | 101 |\n| 2026-05-03 10:05:00 | submitted | buy | BBB | ETF B | 2 | 101 | 202 | 0 | submitted row | submitted_to_broker | 202 |\n| 2026-05-03 10:10:00 | partially_filled | sell | CCC | ETF C | 3 | 102 | 306 | 102 | partial row | broker_filled | 303 |\n| 2026-05-03 10:15:00 | cancelled | buy | DDD | ETF D | 4 | 103 | 412 | 0 | cancelled row | cancelled | 404 |\n| 2026-05-03 10:20:00 | failed | buy | EEE | ETF E | 5 | 104 | 520 | 0 | failed row | broker_failed | 505 |\n| 2026-05-03 10:25:00 | filled | buy | FFF | ETF F | 6 | 105 | 630 | 630 | filled row | broker_filled | 606 |\n| 2026-05-03 10:30:00 | submitted | buy | GGG | ETF G | 7 | 106 | 742 | 0 | cancelled approval row | cancelled | 707 |\n`);

  const rows = listOpenBrokerOrderRows(fixturePath);
  assert(rows.length === 3, `Expected 3 open broker-order rows, got ${rows.length}`);
  assert(rows.every((row) => ['101', '202', '303'].includes(String(row.brokerOrderId))), 'Only open actionable broker orders should be listed');
  console.log(JSON.stringify({ ok: true, rows }, null, 2));
}

main();
