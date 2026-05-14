function classifyActionSeverity(item) {
  if (item.blocking) return 'high';
  if (item.kind === 'approval' || item.kind === 'execution' || item.kind === 'broker' || item.kind === 'blocker' || item.kind === 'data' || item.kind === 'delivery') return 'medium';
  return 'low';
}

function queueTypeForItem(item = {}) {
  if (item.queueType === 'open_runner_retry') return 'open_runner_retry';
  if (item.queueType === 'open_runner_queue') return 'open_runner_queue';
  if (item.kind === 'approval') return 'approval';
  if (item.kind === 'execution') return 'execution';
  if (item.kind === 'broker') return 'recovery';
  if (item.kind === 'delivery') return 'delivery';
  if (item.kind === 'data') return 'data';
  if (item.kind === 'blocker') return item.blocking ? 'blocker' : 'warning';
  return 'workflow';
}

function summarizeOperatorQueue(items = []) {
  const summary = {
    total: items.length,
    blocking: 0,
    approvals: 0,
    execution: 0,
    freshApprovals: 0,
    staleApprovals: 0,
    openRunnerQueue: 0,
    openRunnerRetry: 0,
    recovery: 0,
    delivery: 0,
    data: 0,
    warnings: 0,
    workflow: 0,
    bySeverity: { high: 0, medium: 0, low: 0 },
  };

  for (const item of items) {
    if (item.blocking) summary.blocking += 1;
    if (summary.bySeverity[item.severity] != null) summary.bySeverity[item.severity] += 1;
    const type = item.queueType || queueTypeForItem(item);
    if (type === 'approval') {
      summary.approvals += 1;
      if (item.status === 'stale_needs_reapproval') summary.staleApprovals += 1;
      else if (item.status === 'ready_for_review') summary.freshApprovals += 1;
    }
    else if (type === 'execution') summary.execution += 1;
    else if (type === 'open_runner_queue') summary.openRunnerQueue += 1;
    else if (type === 'open_runner_retry') summary.openRunnerRetry += 1;
    else if (type === 'recovery') summary.recovery += 1;
    else if (type === 'delivery') summary.delivery += 1;
    else if (type === 'data') summary.data += 1;
    else if (type === 'warning' || type === 'blocker') summary.warnings += 1;
    else summary.workflow += 1;
  }

  return summary;
}

module.exports = {
  classifyActionSeverity,
  queueTypeForItem,
  summarizeOperatorQueue,
};
