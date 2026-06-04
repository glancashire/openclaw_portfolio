'use strict';

const RECONCILE_STALE_HOURS = 2; // hours after which a 'submitted' row with no broker info is treated as needing reconcile, not 'in-flight'

function normalizeLifecycleStatus(status, brokerOrder = {}) {
  const raw = String(status || '').trim().toLowerCase();
  const filled = Number(brokerOrder.filled || 0);
  const remaining = Number(brokerOrder.remaining || 0);
  const hasPartialFill = filled > 0 && remaining > 0;
  const hasCompleteFill = filled > 0 && remaining <= 0;

  if (!raw) {
    if (brokerOrder.notFound === true) return 'failed';
    if (hasPartialFill) return 'partially_filled';
    if (hasCompleteFill) return 'filled';
    return brokerOrder.orderId ? 'submitted' : 'approved';
  }
  if (['partially_filled', 'partial', 'partial_fill'].includes(raw) || hasPartialFill) return 'partially_filled';
  if (raw === 'filled' || hasCompleteFill) return 'filled';
  if (['submitted', 'presubmitted', 'api_pending', 'pending_submit', 'pendingcancel'].includes(raw)) {
    return brokerOrder.transmit === false ? 'staged' : 'submitted';
  }
  if (['broker_cancelled'].includes(raw)) return 'cancelled';
  if (['cancelled', 'canceled', 'cancel_requested', 'pending_cancel'].includes(raw)) return 'cancelled';
  if (raw === 'inactive') return 'inactive';
  if (['rejected', 'failed', 'error', 'not_found', 'missing'].includes(raw)) return 'failed';
  if (raw === 'simulated') return 'simulated';
  if (raw === 'quote_unavailable') return 'planned';
  if (['proposed', 'approved', 'planned', 'staged', 'submitted'].includes(raw)) return raw;
  return 'submitted';
}

/**
 * Is a row 'submitted' but missing fresh broker reconciliation info?
 *
 * Returns true when the row is in submitted state AND either:
 *  - brokerOrder is missing/empty (no filled/remaining/status fields ever populated), OR
 *  - the row timestamp is older than RECONCILE_STALE_HOURS hours.
 *
 * Rows like this are NOT genuinely in-flight at the broker — they are bookkeeping
 * artifacts that need to be reconciled (via sync-portfolio-order-status) to find
 * out whether the order was filled, cancelled, or rejected. They should not be
 * surfaced to the operator as 'in-flight, blocks overlapping actions'.
 */
function isSubmittedAwaitingReconcile(row, normalized, now = new Date()) {
  if (normalized !== 'submitted') return false;
  const brokerOrder = row.brokerOrder || {};
  const hasFreshBrokerSignal =
    Number(brokerOrder.filled || 0) > 0 ||
    Number(brokerOrder.remaining || 0) > 0 ||
    Boolean(brokerOrder.status) ||
    Boolean(brokerOrder.lastFill) ||
    Boolean(brokerOrder.execId);
  if (hasFreshBrokerSignal) return false; // genuine in-flight signal
  // No broker reconciliation info at all → check age
  const dateStr = row.date || row.timestamp || row.Date || row.Timestamp;
  if (!dateStr) return true; // unknown age + no broker info → treat as awaiting reconcile
  const rowDate = new Date(String(dateStr).replace(' ', 'T') + (String(dateStr).includes('T') || String(dateStr).endsWith('Z') ? '' : 'Z'));
  if (Number.isNaN(rowDate.getTime())) return true;
  const ageHours = (now.getTime() - rowDate.getTime()) / 3600000;
  return ageHours > RECONCILE_STALE_HOURS;
}

function summarizeLifecycleStatuses(rows = [], options = {}) {
  const now = options.now || new Date();
  const summary = {
    proposed: 0,
    approved: 0,
    rejected: 0,
    staged: 0,
    submitted: 0,
    submittedAwaitingReconcile: 0, // subset of `submitted`: no broker reconciliation info + older than threshold
    partiallyFilled: 0,
    filled: 0,
    cancelled: 0,
    failed: 0,
    inactive: 0,
    simulated: 0,
    planned: 0,
    withBrokerOrderId: 0,
  };

  for (const row of rows) {
    const normalized = normalizeLifecycleStatus(row.status || row.Status || '', row.brokerOrder || {});
    if (normalized === 'proposed') summary.proposed += 1;
    else if (normalized === 'approved') summary.approved += 1;
    else if (normalized === 'rejected') summary.rejected += 1;
    else if (normalized === 'staged') summary.staged += 1;
    else if (normalized === 'submitted') {
      summary.submitted += 1;
      if (isSubmittedAwaitingReconcile(row, normalized, now)) summary.submittedAwaitingReconcile += 1;
    }
    else if (normalized === 'partially_filled') summary.partiallyFilled += 1;
    else if (normalized === 'filled') summary.filled += 1;
    else if (normalized === 'cancelled') summary.cancelled += 1;
    else if (normalized === 'failed') summary.failed += 1;
    else if (normalized === 'inactive') summary.inactive += 1;
    else if (normalized === 'simulated') summary.simulated += 1;
    else if (normalized === 'planned') summary.planned += 1;

    const brokerOrderId = row.brokerOrderId || row['Broker order id'];
    if (String(brokerOrderId || '').trim()) summary.withBrokerOrderId += 1;
  }

  return summary;
}

/**
 * How many rows are genuinely in-flight at the broker right now (block overlapping actions)?
 * Excludes 'submitted' rows that look like they need reconciliation rather than active execution.
 */
function trulyInFlightCount(summary = {}) {
  const submitted = Number(summary.submitted || 0);
  const awaiting = Number(summary.submittedAwaitingReconcile || 0);
  const staged = Number(summary.staged || 0);
  const partial = Number(summary.partiallyFilled || 0);
  return Math.max(0, submitted - awaiting) + staged + partial;
}

module.exports = {
  normalizeLifecycleStatus,
  summarizeLifecycleStatuses,
  isSubmittedAwaitingReconcile,
  trulyInFlightCount,
  RECONCILE_STALE_HOURS,
};
