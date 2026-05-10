'use strict';

const assert = require('assert');
const { normalizeLifecycleStatus, summarizeLifecycleStatuses } = require('../src/execution/lifecycleStatus');

assert.strictEqual(normalizeLifecycleStatus('submitted', { transmit: false }), 'staged');
assert.strictEqual(normalizeLifecycleStatus('Submitted', { transmit: true }), 'submitted');
assert.strictEqual(normalizeLifecycleStatus('Filled', {}), 'filled');
assert.strictEqual(normalizeLifecycleStatus('partial', { filled: 1, remaining: 1 }), 'partially_filled');
assert.strictEqual(normalizeLifecycleStatus('pending_cancel', {}), 'cancelled');
assert.strictEqual(normalizeLifecycleStatus('error', {}), 'failed');
assert.strictEqual(normalizeLifecycleStatus('quote_unavailable', {}), 'planned');
assert.strictEqual(normalizeLifecycleStatus('', { orderId: 123 }), 'submitted');
assert.strictEqual(normalizeLifecycleStatus('', { filled: 1, remaining: 0 }), 'filled');

const summary = summarizeLifecycleStatuses([
  { status: 'proposed' },
  { status: 'approved' },
  { status: 'submitted', brokerOrder: { transmit: false }, brokerOrderId: '1' },
  { status: 'submitted', brokerOrder: { transmit: true }, brokerOrderId: '2' },
  { status: 'partial', brokerOrder: { filled: 1, remaining: 1 }, brokerOrderId: '3' },
  { status: 'filled', brokerOrderId: '4' },
  { status: 'cancelled', brokerOrderId: '5' },
  { status: 'error' },
  { status: 'simulated' },
  { status: 'quote_unavailable' },
]);

assert.strictEqual(summary.proposed, 1);
assert.strictEqual(summary.approved, 1);
assert.strictEqual(summary.staged, 1);
assert.strictEqual(summary.submitted, 1);
assert.strictEqual(summary.partiallyFilled, 1);
assert.strictEqual(summary.filled, 1);
assert.strictEqual(summary.cancelled, 1);
assert.strictEqual(summary.failed, 1);
assert.strictEqual(summary.simulated, 1);
assert.strictEqual(summary.planned, 1);
assert.strictEqual(summary.withBrokerOrderId, 5);

console.log(JSON.stringify({ ok: true }, null, 2));
