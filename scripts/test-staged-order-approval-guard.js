const fs = require('fs');
const path = require('path');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const fixturePath = path.resolve(process.argv[2] || '/tmp/test-staged-order-approval-guard.md');
fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 12:00:00 | staged | buy | AAA | ETF A | 1 | 100 | 100 | 0 | staged row | staged_not_transmitted | 4242 |\n| 2026-05-03 12:05:00 | proposed | buy | BBB | ETF B | 2 | 101 | 202 | 0 | proposal row | pending_user_approval | |\n`);

const { markTradeApproved, rejectTradeProposal, readTradesTable } = require('../src/execution/tradeState');

const approveStaged = markTradeApproved(fixturePath, { tickerOrIsin: 'AAA', action: 'buy' }, 'user_approved');
assert(approveStaged.updated === 0, 'Staged trade must not be re-approved');

const rejectStaged = rejectTradeProposal(fixturePath, { tickerOrIsin: 'AAA', action: 'buy' }, 'user_rejected');
assert(rejectStaged.updated === 0, 'Staged trade must not be rejected via proposal rejection flow');

const approveProposed = markTradeApproved(fixturePath, { tickerOrIsin: 'BBB', action: 'buy' }, 'user_approved');
assert(approveProposed.updated === 1, 'Proposed trade should still be approvable');

const rows = readTradesTable(fixturePath).rows;
const stagedRow = rows.find((row) => row['Ticker / ISIN'] === 'AAA');
const proposedRow = rows.find((row) => row['Ticker / ISIN'] === 'BBB');

assert(stagedRow.Status === 'staged', `Expected staged status to remain staged, got ${stagedRow.Status}`);
assert(stagedRow.Approval === 'staged_not_transmitted', `Expected staged approval to remain staged_not_transmitted, got ${stagedRow.Approval}`);
assert(proposedRow.Status === 'approved', `Expected proposed row to become approved, got ${proposedRow.Status}`);
assert(proposedRow.Approval === 'user_approved', `Expected proposed row approval to become user_approved, got ${proposedRow.Approval}`);

console.log(JSON.stringify({ ok: true, rows }, null, 2));
