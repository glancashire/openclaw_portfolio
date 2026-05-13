'use strict';

function parseTradeDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const isoLike = raw.replace(' ', 'T') + (raw.includes('T') ? '' : 'Z');
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hoursBetween(earlier, later = new Date()) {
  if (!(earlier instanceof Date) || Number.isNaN(earlier.getTime())) return null;
  return (later.getTime() - earlier.getTime()) / 36e5;
}

function classifyTradeRowExecution(row = {}, options = {}) {
  const now = options.now || new Date();
  const maxApprovalAgeHours = Number(options.maxApprovalAgeHours || 24);
  const status = String(row.Status || '').trim().toLowerCase();
  const approval = String(row.Approval || '').trim();
  const blockCode = String(row['Block code'] || '').trim();
  const blockReason = String(row['Block reason'] || '').trim();
  const nextAction = String(row['Next action'] || '').trim();
  const nextActionLower = nextAction.toLowerCase();
  const action = String(row.Action || '').trim().toLowerCase();
  const orderId = String(row['Broker order id'] || '').trim();
  const approvedAt = parseTradeDate(row['Date/time']);
  const approvalAgeHours = hoursBetween(approvedAt, now);
  const staleApproval = ['approved', 'planned', 'proposed'].includes(status)
    && ['user_approved', 'submitted_to_open_runner', 'ready_for_submission', 'queued_for_open_runner'].includes(approval)
    && approvalAgeHours != null
    && approvalAgeHours > maxApprovalAgeHours;
  const retryableQueuedBlock = approval === 'queued_for_open_runner' && !orderId && blockCode && nextActionLower.includes('retry');

  if (action === 'hold') {
    return {
      canonicalState: 'blocked_hard',
      executable: false,
      reasonCode: 'hold_action',
      reason: 'Hold rows are informational and never executable.',
      nextAction: nextAction || 'No execution action required for hold rows.',
      staleApproval: false,
      approvalAgeHours: approvalAgeHours == null ? null : Number(approvalAgeHours.toFixed(2)),
    };
  }

  if (orderId) {
    const stateByStatus = {
      staged: 'broker_submitted',
      submitted: 'broker_submitted',
      partially_filled: 'partially_filled',
      filled: 'filled',
      cancelled: 'cancelled',
      inactive: 'blocked_hard',
      failed: 'blocked_hard',
    };
    return {
      canonicalState: stateByStatus[status] || 'broker_submitted',
      executable: false,
      reasonCode: 'already_submitted',
      reason: `Row already has broker order id ${orderId}.`,
      nextAction: nextAction || 'Reconcile the existing broker order before attempting another submission.',
      staleApproval: false,
      approvalAgeHours: approvalAgeHours == null ? null : Number(approvalAgeHours.toFixed(2)),
    };
  }

  if (!['approved', 'planned', 'proposed'].includes(status)) {
    return {
      canonicalState: 'blocked_hard',
      executable: false,
      reasonCode: 'status_not_executable',
      reason: `Row status ${status || 'unknown'} is not eligible for executable selection.`,
      nextAction: nextAction || 'Normalize the row status before attempting submission.',
      staleApproval: false,
      approvalAgeHours: approvalAgeHours == null ? null : Number(approvalAgeHours.toFixed(2)),
    };
  }

  if (!['user_approved', 'submitted_to_open_runner', 'ready_for_submission', 'queued_for_open_runner'].includes(approval)) {
    const canonicalState = status === 'proposed' || approval === 'pending_user_approval' ? 'proposal' : 'blocked_hard';
    return {
      canonicalState,
      executable: false,
      reasonCode: 'approval_not_ready',
      reason: `Row approval state ${approval || 'unknown'} is not executable.`,
      nextAction: nextAction || 'Approve or queue the row explicitly before attempting submission.',
      staleApproval: false,
      approvalAgeHours: approvalAgeHours == null ? null : Number(approvalAgeHours.toFixed(2)),
    };
  }

  if (staleApproval) {
    return {
      canonicalState: 'stale_needs_reapproval',
      executable: false,
      reasonCode: 'stale_approval',
      reason: `Approval is stale at ${Number(approvalAgeHours.toFixed(2))}h; refresh operator approval before live submission.`,
      nextAction: nextAction || 'Refresh the approval timestamp before arming or submitting this row.',
      staleApproval: true,
      approvalAgeHours: Number(approvalAgeHours.toFixed(2)),
    };
  }

  if (blockCode && !retryableQueuedBlock) {
    return {
      canonicalState: 'blocked_retryable',
      executable: false,
      reasonCode: blockCode || 'blocked',
      reason: blockReason || `Blocked by ${blockCode}.`,
      nextAction: nextAction || 'Resolve the blocking condition before retrying submission.',
      staleApproval: false,
      approvalAgeHours: approvalAgeHours == null ? null : Number(approvalAgeHours.toFixed(2)),
    };
  }

  if (approval === 'queued_for_open_runner') {
    return {
      canonicalState: retryableQueuedBlock ? 'queued_retry' : 'queued_first_handoff',
      executable: true,
      reasonCode: retryableQueuedBlock ? 'retryable_queued_block' : 'ready',
      reason: String(row.Reason || '').trim(),
      nextAction: nextAction || (retryableQueuedBlock ? 'Retry at next intended market-open run after operator recovery.' : 'First open-runner attempt pending.'),
      retryableQueuedBlock,
      staleApproval: false,
      approvalAgeHours: approvalAgeHours == null ? null : Number(approvalAgeHours.toFixed(2)),
    };
  }

  if (approval === 'submitted_to_open_runner') {
    return {
      canonicalState: 'executable_now',
      executable: true,
      reasonCode: 'ready',
      reason: String(row.Reason || '').trim(),
      nextAction: nextAction || 'Ready for submission.',
      staleApproval: false,
      approvalAgeHours: approvalAgeHours == null ? null : Number(approvalAgeHours.toFixed(2)),
    };
  }

  if (approval === 'ready_for_submission' || approval === 'user_approved') {
    return {
      canonicalState: 'approved',
      executable: true,
      reasonCode: 'ready',
      reason: String(row.Reason || '').trim(),
      nextAction: nextAction || 'Ready for submission.',
      staleApproval: false,
      approvalAgeHours: approvalAgeHours == null ? null : Number(approvalAgeHours.toFixed(2)),
    };
  }

  return {
    canonicalState: 'blocked_hard',
    executable: false,
    reasonCode: 'unclassified',
    reason: 'Row could not be classified into a live execution state.',
    nextAction: nextAction || 'Review the row and normalize it before submission.',
    staleApproval: false,
    approvalAgeHours: approvalAgeHours == null ? null : Number(approvalAgeHours.toFixed(2)),
  };
}

module.exports = {
  parseTradeDate,
  hoursBetween,
  classifyTradeRowExecution,
};
