const fs = require('fs');
const path = require('path');
const { rejectTradeProposal, readTradesTable } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const fixturePath = path.resolve(process.argv[2] || '/tmp/test-reject-trade-transition.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 10:00:00 | proposed | buy | AAA | ETF A | 1 | 100 | 100 | 0 | first draft | pending_user_approval | |\n| 2026-05-03 10:15:00 | proposed | buy | AAA | ETF A | 2 | 110 | 220 | 0 | refreshed draft | pending_user_approval | |\n| 2026-05-03 10:20:00 | approved | buy | BBB | ETF B | 3 | 120 | 360 | 0 | approved row | user_approved | |\n| 2026-05-03 10:25:00 | submitted | buy | CCC | ETF C | 4 | 130 | 520 | 0 | submitted row | submitted_to_broker | 555 |\n`);

  const staleAttempt = rejectTradeProposal(fixturePath, { dateTime: '2026-05-03 10:00:00', tickerOrIsin: 'AAA', action: 'buy' });
  const latestAttempt = rejectTradeProposal(fixturePath, { dateTime: '2026-05-03 10:15:00', tickerOrIsin: 'AAA', action: 'buy' });
  const approvedAttempt = rejectTradeProposal(fixturePath, { tickerOrIsin: 'BBB', action: 'buy' });
  const submittedAttempt = rejectTradeProposal(fixturePath, { tickerOrIsin: 'CCC', action: 'buy' });
  const rows = readTradesTable(fixturePath).rows;

  const staleRow = rows.find((row) => row['Date/time'] === '2026-05-03 10:00:00');
  const latestRow = rows.find((row) => row['Date/time'] === '2026-05-03 10:15:00');
  const approvedRow = rows.find((row) => row['Ticker / ISIN'] === 'BBB');
  const submittedRow = rows.find((row) => row['Ticker / ISIN'] === 'CCC');

  assert(staleAttempt.updated === 0, 'Stale proposal should not be rejectable once superseded');
  assert(staleRow.Status === 'proposed', 'Stale row must remain proposed');

  assert(latestAttempt.updated === 1, 'Latest pending proposal should be rejectable');
  assert(latestRow.Status === 'rejected', 'Latest proposal should move to rejected');
  assert(latestRow.Approval === 'user_rejected', 'Latest proposal should record rejection');

  assert(approvedAttempt.updated === 1, 'Approved trade should be rejectable before submission');
  assert(approvedRow.Status === 'rejected', 'Approved row should move to rejected');

  assert(submittedAttempt.updated === 0, 'Submitted trade must not be rejected via approval transition');
  assert(submittedRow.Status === 'submitted', 'Submitted row must stay submitted');

  console.log(JSON.stringify({ ok: true, staleAttempt, latestAttempt, approvedAttempt, submittedAttempt }, null, 2));
}

main();
