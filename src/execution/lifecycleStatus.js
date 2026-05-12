'use strict';

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

function summarizeLifecycleStatuses(rows = []) {
  const summary = {
    proposed: 0,
    approved: 0,
    rejected: 0,
    staged: 0,
    submitted: 0,
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
    else if (normalized === 'submitted') summary.submitted += 1;
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

module.exports = {
  normalizeLifecycleStatus,
  summarizeLifecycleStatuses,
};
