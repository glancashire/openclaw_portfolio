'use strict';

/**
 * Test: lifecycle counter correctly separates 'submitted-awaiting-reconcile'
 * from genuinely in-flight orders.
 *
 * This is the I1 fix from the Phase I health-monitor follow-on:
 * - 'inactive' rows are terminal (already handled correctly)
 * - 'submitted' rows with no broker reconciliation info AND older than threshold
 *   are reclassified as 'submittedAwaitingReconcile' (a subset of 'submitted')
 * - delivery policy treats those as a reconcile-debt message, not 'in-flight'
 * - trulyInFlightCount returns only genuine in-flight rows
 */

const assert = require('assert');
const {
  summarizeLifecycleStatuses,
  isSubmittedAwaitingReconcile,
  trulyInFlightCount,
  normalizeLifecycleStatus,
  RECONCILE_STALE_HOURS,
} = require('../src/execution/lifecycleStatus');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok --', label);
  asserted++;
}

const NOW = new Date('2026-06-04T09:30:00Z');

// ── Inactive rows are terminal (sanity check existing behavior) ────────────────
{
  const rows = [
    { status: 'inactive', brokerOrderId: '9163' },
    { status: 'inactive', brokerOrderId: '9163' },
  ];
  const s = summarizeLifecycleStatuses(rows, { now: NOW });
  ok('inactive: counted as inactive, not in-flight', s.inactive === 2 && s.submitted === 0 && s.staged === 0);
  ok('inactive: trulyInFlight=0', trulyInFlightCount(s) === 0);
}

// ── Recent submitted with fresh broker signal → genuine in-flight ──────────────
{
  const row = {
    status: 'submitted',
    date: '2026-06-04 09:00:00',
    brokerOrderId: '9200',
    brokerOrder: { remaining: 100, status: 'PreSubmitted' },
  };
  const normalized = normalizeLifecycleStatus(row.status, row.brokerOrder);
  ok('fresh-signal: normalizes to submitted', normalized === 'submitted');
  ok('fresh-signal: NOT awaiting reconcile', !isSubmittedAwaitingReconcile(row, normalized, NOW));
  const s = summarizeLifecycleStatuses([row], { now: NOW });
  ok('fresh-signal: submitted=1', s.submitted === 1);
  ok('fresh-signal: submittedAwaitingReconcile=0', s.submittedAwaitingReconcile === 0);
  ok('fresh-signal: trulyInFlight=1', trulyInFlightCount(s) === 1);
}

// ── Recent submitted with NO broker info, within threshold → still in-flight ──
{
  const row = {
    status: 'submitted',
    date: '2026-06-04 09:00:00', // 30 min ago vs NOW 09:30 → within 2h
    brokerOrderId: '9300',
    brokerOrder: {},
  };
  const normalized = normalizeLifecycleStatus(row.status, row.brokerOrder);
  ok('recent-no-info: NOT awaiting reconcile (within threshold)', !isSubmittedAwaitingReconcile(row, normalized, NOW));
  const s = summarizeLifecycleStatuses([row], { now: NOW });
  ok('recent-no-info: trulyInFlight=1', trulyInFlightCount(s) === 1);
}

// ── Old submitted with NO broker info → awaiting reconcile ─────────────────────
{
  const row = {
    status: 'submitted',
    date: '2026-06-03 14:29:32', // ~19h ago
    brokerOrderId: '9167',
    brokerOrder: {},
  };
  const normalized = normalizeLifecycleStatus(row.status, row.brokerOrder);
  ok('stale-no-info: normalizes to submitted', normalized === 'submitted');
  ok('stale-no-info: IS awaiting reconcile', isSubmittedAwaitingReconcile(row, normalized, NOW));
  const s = summarizeLifecycleStatuses([row], { now: NOW });
  ok('stale-no-info: submitted=1', s.submitted === 1);
  ok('stale-no-info: submittedAwaitingReconcile=1', s.submittedAwaitingReconcile === 1);
  ok('stale-no-info: trulyInFlight=0 (excluded)', trulyInFlightCount(s) === 0);
}

// ── Mixed: 5 stale-no-info + 1 fresh-signal → 1 in-flight, 5 reconcile ────────
{
  const rows = [
    { status: 'submitted', date: '2026-06-03 14:29:29', brokerOrderId: '9165', brokerOrder: {} },
    { status: 'submitted', date: '2026-06-03 14:29:31', brokerOrderId: '9166', brokerOrder: {} },
    { status: 'submitted', date: '2026-06-03 14:29:32', brokerOrderId: '9167', brokerOrder: {} },
    { status: 'submitted', date: '2026-06-03 14:29:34', brokerOrderId: '9168', brokerOrder: {} },
    { status: 'submitted', date: '2026-06-02 14:01:32', brokerOrderId: '9164', brokerOrder: {} },
    { status: 'submitted', date: '2026-06-04 09:25:00', brokerOrderId: '9200', brokerOrder: { remaining: 50, status: 'Submitted' } },
  ];
  const s = summarizeLifecycleStatuses(rows, { now: NOW });
  ok('mixed: submitted total=6', s.submitted === 6);
  ok('mixed: submittedAwaitingReconcile=5', s.submittedAwaitingReconcile === 5);
  ok('mixed: trulyInFlight=1 (only the fresh one)', trulyInFlightCount(s) === 1);
}

// ── Staged + partiallyFilled are always trulyInFlight ──────────────────────────
{
  const rows = [
    { status: 'staged', brokerOrderId: '9301', brokerOrder: {} },
    { status: 'partial_fill', brokerOrderId: '9302', brokerOrder: { filled: 5, remaining: 5 } },
  ];
  const s = summarizeLifecycleStatuses(rows, { now: NOW });
  ok('staged+partial: staged=1', s.staged === 1);
  ok('staged+partial: partiallyFilled=1', s.partiallyFilled === 1);
  ok('staged+partial: trulyInFlight=2', trulyInFlightCount(s) === 2);
}

// ── RECONCILE_STALE_HOURS exported for callers that want to surface the threshold ─
{
  ok('threshold: constant exported', typeof RECONCILE_STALE_HOURS === 'number' && RECONCILE_STALE_HOURS > 0);
}

console.log('\nlifecycle-counter-awaiting-reconcile tests: ' + asserted + ' assertions passed');
