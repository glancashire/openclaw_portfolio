'use strict';

const fs = require('fs');
const path = require('path');
const { appendTradeEvent, readTradesTable, listOpenBrokerOrderRows } = require('../src/execution/tradeState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const fixturePath = path.resolve('/tmp/test-trade-state-phase-51.md');
  fs.writeFileSync(fixturePath, `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n`);

  appendTradeEvent(fixturePath, {
    status: 'blocked_before_submission',
    action: 'buy',
    tickerOrIsin: 'AAA',
    name: 'ETF A',
    quantity: 1,
    limitPrice: 100,
    estimatedChf: 100,
    approval: 'pending_user_approval',
    brokerOrderId: '',
    reason: 'Blocked before submission.',
    blockCode: 'approval_required',
    blockReason: 'Live execution requires explicit user approval flag.',
    blockedAt: '2026-05-09 12:00:00',
    nextAction: 'Approve the pending trade and retry at market open.',
  }, '2026-05-09 12:00:00');

  const rows = readTradesTable(fixturePath).rows;
  assert(rows.length === 1, 'expected one row');
  assert(rows[0]['Block code'] === 'approval_required', 'expected block code persisted');
  assert(/retry at market open/i.test(rows[0]['Next action']), 'expected next action persisted');

  const openRows = listOpenBrokerOrderRows(fixturePath);
  assert(openRows.length === 0, 'blocked-before-submission rows must not look like open broker orders');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
