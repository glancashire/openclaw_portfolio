'use strict';

const assert = require('assert');
const { classifyTradeRowExecution } = require('../src/execution/executionClassification');

(function main() {
  const now = new Date('2026-05-10T11:00:00Z');

  const staleApproved = classifyTradeRowExecution({
    'Date/time': '2026-05-08 09:00:00',
    Status: 'approved',
    Action: 'buy',
    Approval: 'user_approved',
    'Ticker / ISIN': 'AAA',
  }, { now, maxApprovalAgeHours: 24 });
  assert.strictEqual(staleApproved.canonicalState, 'stale_needs_reapproval');
  assert.strictEqual(staleApproved.executable, false);
  assert.strictEqual(staleApproved.staleApproval, true);

  const retryQueued = classifyTradeRowExecution({
    'Date/time': '2026-05-10 09:00:00',
    Status: 'approved',
    Action: 'buy',
    Approval: 'queued_for_open_runner',
    'Ticker / ISIN': 'BBB',
    'Block code': 'quote_unavailable',
    'Next action': 'Retry at next intended market-open run after operator recovery.',
  }, { now, maxApprovalAgeHours: 24 });
  assert.strictEqual(retryQueued.canonicalState, 'queued_retry');
  assert.strictEqual(retryQueued.executable, true);

  const firstHandoff = classifyTradeRowExecution({
    'Date/time': '2026-05-10 10:00:00',
    Status: 'approved',
    Action: 'buy',
    Approval: 'queued_for_open_runner',
    'Ticker / ISIN': 'CCC',
  }, { now, maxApprovalAgeHours: 24 });
  assert.strictEqual(firstHandoff.canonicalState, 'queued_first_handoff');
  assert.strictEqual(firstHandoff.executable, true);

  const blocked = classifyTradeRowExecution({
    'Date/time': '2026-05-10 10:00:00',
    Status: 'approved',
    Action: 'buy',
    Approval: 'user_approved',
    'Ticker / ISIN': 'DDD',
    'Block code': 'quote_unavailable',
    'Block reason': 'No broker quote was available.',
  }, { now, maxApprovalAgeHours: 24 });
  assert.strictEqual(blocked.canonicalState, 'blocked_retryable');
  assert.strictEqual(blocked.executable, false);

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
