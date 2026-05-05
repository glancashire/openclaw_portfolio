const fs = require('fs');
const path = require('path');
const { listOpenBrokerOrderRows } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const fixturePath = path.resolve(process.argv[2] || '/tmp/test-resync-latest-row-only.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 10:00:00 | approved | buy | AAA | ETF A | 1 | 100 | 100 | 0 | approved row | user_approved | 101 |\n| 2026-05-03 10:05:00 | submitted | buy | AAA | ETF A | 1 | 100 | 100 | 0 | submitted row | submitted_to_broker | 101 |\n| 2026-05-03 10:10:00 | partially_filled | buy | AAA | ETF A | 1 | 100 | 50 | 50 | partial row | broker_filled | 101 |\n| 2026-05-03 10:15:00 | submitted | buy | BBB | ETF B | 2 | 101 | 202 | 0 | submitted row | submitted_to_broker | 202 |\n`);

  const rows = listOpenBrokerOrderRows(fixturePath);
  assert(rows.length === 2, `Expected 2 open broker-order rows, got ${rows.length}`);

  const aaaRows = rows.filter((row) => row.brokerOrderId === '101');
  assert(aaaRows.length === 1, `Expected only latest AAA row for order 101, got ${aaaRows.length}`);
  assert(aaaRows[0].status === 'partially_filled', `Expected latest AAA status partially_filled, got ${aaaRows[0].status}`);
  assert(aaaRows[0].dateTime === '2026-05-03 10:10:00', `Expected latest AAA row timestamp, got ${aaaRows[0].dateTime}`);

  const bbbRow = rows.find((row) => row.brokerOrderId === '202');
  assert(Boolean(bbbRow), 'Expected BBB row included');

  console.log(JSON.stringify({ ok: true, rows }, null, 2));
}

main();
