const fs = require('fs');
const path = require('path');
const { markTradeApproved, readTradesTable } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const fixturePath = path.resolve(process.argv[2] || '/tmp/test-stale-proposal-approval-guard.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 10:00:00 | proposed | buy | AAA | ETF A | 1 | 100 | 100 | 0 | first draft | pending_user_approval | |\n| 2026-05-03 10:15:00 | proposed | buy | AAA | ETF A | 2 | 110 | 220 | 0 | refreshed draft | pending_user_approval | |\n| 2026-05-03 10:20:00 | proposed | buy | BBB | ETF B | 3 | 120 | 360 | 0 | only draft | pending_user_approval | |\n`);

  const staleAttempt = markTradeApproved(fixturePath, { dateTime: '2026-05-03 10:00:00', tickerOrIsin: 'AAA', action: 'buy' });
  const latestAttempt = markTradeApproved(fixturePath, { dateTime: '2026-05-03 10:15:00', tickerOrIsin: 'AAA', action: 'buy' });
  const singleAttempt = markTradeApproved(fixturePath, { tickerOrIsin: 'BBB', action: 'buy' });
  const rows = readTradesTable(fixturePath).rows;

  const staleRow = rows.find((row) => row['Date/time'] === '2026-05-03 10:00:00');
  const latestRow = rows.find((row) => row['Date/time'] === '2026-05-03 10:15:00');
  const singleRow = rows.find((row) => row['Ticker / ISIN'] === 'BBB');

  assert(staleAttempt.updated === 0, 'Stale proposal should not be approvable');
  assert(staleRow.Status === 'proposed', 'Stale proposal must remain proposed');
  assert(staleRow.Approval === 'pending_user_approval', 'Stale proposal approval must remain pending');

  assert(latestAttempt.updated === 1, 'Latest proposal should be approvable');
  assert(latestRow.Status === 'approved', 'Latest proposal should move to approved');
  assert(latestRow.Approval === 'user_approved', 'Latest proposal should capture approval');

  assert(singleAttempt.updated === 1, 'Single pending proposal should be approvable');
  assert(singleRow.Status === 'approved', 'Single pending proposal should move to approved');

  console.log(JSON.stringify({ ok: true, staleAttempt, latestAttempt, singleAttempt }, null, 2));
}

main();
