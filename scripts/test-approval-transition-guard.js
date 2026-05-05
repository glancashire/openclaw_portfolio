const fs = require('fs');
const path = require('path');
const { markTradeApproved, readTradesTable } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const fixturePath = path.resolve(process.argv[2] || '/tmp/test-approval-transition-guard.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 12:00:00 | proposed | buy | AAA | ETF A | 1 | 100 | 100 | 0 | proposal row | pending_user_approval | |\n| 2026-05-03 12:05:00 | submitted | buy | BBB | ETF B | 2 | 101 | 202 | 0 | submitted row | submitted_to_broker | 555 |\n| 2026-05-03 12:10:00 | filled | buy | CCC | ETF C | 3 | 102 | 306 | 306 | filled row | broker_filled | 777 |\n`);

  const proposed = markTradeApproved(fixturePath, { tickerOrIsin: 'AAA' });
  const submitted = markTradeApproved(fixturePath, { tickerOrIsin: 'BBB' });
  const filled = markTradeApproved(fixturePath, { tickerOrIsin: 'CCC' });
  const rows = readTradesTable(fixturePath).rows;

  const proposedRow = rows.find((row) => row['Ticker / ISIN'] === 'AAA');
  const submittedRow = rows.find((row) => row['Ticker / ISIN'] === 'BBB');
  const filledRow = rows.find((row) => row['Ticker / ISIN'] === 'CCC');

  assert(proposed.updated === 1, 'Expected proposed row to be approved');
  assert(proposedRow.Status === 'approved', 'Proposed row should move to approved');
  assert(proposedRow.Approval === 'user_approved', 'Proposed row should record approval');

  assert(submitted.updated === 0, 'Submitted row should not be re-approved');
  assert(submittedRow.Status === 'submitted', 'Submitted row should remain submitted');
  assert(submittedRow.Approval === 'submitted_to_broker', 'Submitted row approval should remain unchanged');

  assert(filled.updated === 0, 'Filled row should not be re-approved');
  assert(filledRow.Status === 'filled', 'Filled row should remain filled');
  assert(filledRow.Approval === 'broker_filled', 'Filled row approval should remain unchanged');

  console.log(JSON.stringify({ ok: true, proposed, submitted, filled }, null, 2));
}

main();
