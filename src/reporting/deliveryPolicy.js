const fs = require('fs');
const path = require('path');
const { fileFreshnessSummary } = require('./freshness');
const { latestHistory, executionLifecycleSummary } = require('./portfolioData');
const { brokerErrorStatus } = require('../execution/runtimeState');
const { loadFillNotificationState } = require('./fillNotificationState');

function repoRootFromPortfolioDir(portfolioDir) {
  return path.resolve(portfolioDir, '..', '..');
}

function defaultDeliveryPolicy(portfolioName = 'unknown') {
  return {
    portfolio: portfolioName,
    deliveryMode: 'local_only',
    intendedChannels: ['repo_artifacts'],
    externalDeliveryEnabled: false,
    emailProvider: 'mailgun',
    emailRecipients: [],
    failureAlertMode: 'local_operator_review',
    failureAlertTargets: ['dashboard', 'markdown_report', 'report_cycle_json'],
    pendingActionThresholds: {
      staleDashboard: true,
      failedTrades: 1,
      inFlightOrders: 1,
      brokerAutomationPaused: true,
    },
    notes: [
      'Default repo policy is local-only and side-effect-free.',
      'Any real outbound delivery should be enabled outside this repo with explicit operator approval.',
    ],
  };
}

function readPolicyOverride(repoRoot) {
  const policyPath = path.join(repoRoot, 'config', 'report_delivery_policy.json');
  if (!fs.existsSync(policyPath)) return { policyPath, override: null };
  return {
    policyPath,
    override: JSON.parse(fs.readFileSync(policyPath, 'utf8')),
  };
}

function effectiveDeliveryPolicy(portfolioDir) {
  const portfolioName = path.basename(portfolioDir);
  const repoRoot = repoRootFromPortfolioDir(portfolioDir);
  const base = defaultDeliveryPolicy(portfolioName);
  const { policyPath, override } = readPolicyOverride(repoRoot);
  return {
    ...base,
    ...(override || {}),
    portfolio: portfolioName,
    intendedChannels: Array.isArray(override?.intendedChannels) ? override.intendedChannels : base.intendedChannels,
    failureAlertTargets: Array.isArray(override?.failureAlertTargets) ? override.failureAlertTargets : base.failureAlertTargets,
    emailProvider: typeof override?.emailProvider === 'string' && override.emailProvider.trim() ? override.emailProvider : base.emailProvider,
    emailRecipients: Array.isArray(override?.emailRecipients) ? override.emailRecipients : base.emailRecipients,
    pendingActionThresholds: {
      ...base.pendingActionThresholds,
      ...(override?.pendingActionThresholds || {}),
    },
    notes: Array.isArray(override?.notes) ? override.notes : base.notes,
    policyPath,
    overrideLoaded: Boolean(override),
  };
}

function reportPendingActions({ lifecycleSummary = {}, freshness = null, brokerErrorState = null, generationMeta = null, workflow = null, policy = null, fillNotificationState = null }) {
  const actions = [];
  const thresholds = policy?.pendingActionThresholds || defaultDeliveryPolicy().pendingActionThresholds;
  if (thresholds.staleDashboard && freshness?.stale) {
    actions.push('Dashboard/report freshness is stale relative to source state.');
  }
  if (Number(lifecycleSummary.failed || 0) >= Number(thresholds.failedTrades || 1) && Number(lifecycleSummary.failed || 0) > 0) {
    actions.push(`${lifecycleSummary.failed} trade row(s) are marked failed and need operator review.`);
  }
  const inflight = Number(lifecycleSummary.staged || 0) + Number(lifecycleSummary.submitted || 0) + Number(lifecycleSummary.partiallyFilled || 0);
  if (inflight >= Number(thresholds.inFlightOrders || 1) && inflight > 0) {
    actions.push(`${inflight} in-flight execution row(s) need reconciliation before overlapping actions.`);
  }
  if (thresholds.brokerAutomationPaused && brokerErrorState?.stopAutomation) {
    actions.push(`Broker automation is paused after ${brokerErrorState.consecutive} consecutive broker errors.`);
  }
  if (generationMeta?.renderWarning) {
    actions.push(`Report rendering used fallback handling (${generationMeta.renderWarning}).`);
  }
  const reconciledUnnotified = Number(fillNotificationState?.reconciledUnnotifiedFills?.length || 0);
  if (reconciledUnnotified > 0) {
    actions.push(`${reconciledUnnotified} reconciled fill(s) still need notification backfill review.`);
  }
  const failedWorkflow = Array.isArray(workflow) ? workflow.filter((step) => step.ok === false) : [];
  for (const step of failedWorkflow) {
    actions.push(`Report workflow step failed: ${step.name} (${step.error || 'unknown error'}).`);
  }
  return actions;
}

function reportDeliveryStatus({ portfolioDir, generationMeta = null, workflow = null }) {
  const portfolioName = path.basename(portfolioDir);
  const policy = effectiveDeliveryPolicy(portfolioDir);
  const repoRoot = repoRootFromPortfolioDir(portfolioDir);
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const historyPath = path.join(portfolioDir, 'history.md');
  const dashboardPath = path.join(portfolioDir, 'dashboard.md');
  const freshness = fileFreshnessSummary({
    dashboardPath,
    sourcePaths: [portfolioPath, holdingsPath, tradesPath, historyPath].filter((filePath) => fs.existsSync(filePath)),
  });
  const lifecycleSummary = fs.existsSync(tradesPath) ? executionLifecycleSummary(tradesPath, { actionableOnly: true }) : {};
  const brokerErrorState = brokerErrorStatus(portfolioName);
  const latestSnapshot = fs.existsSync(historyPath) ? latestHistory(historyPath) : null;
  const fillNotificationState = loadFillNotificationState(repoRoot);
  const pendingActions = reportPendingActions({ lifecycleSummary, freshness, brokerErrorState, generationMeta, workflow, policy, fillNotificationState });
  return {
    portfolio: portfolioName,
    deliveryMode: policy.deliveryMode,
    intendedChannels: policy.intendedChannels,
    externalDeliveryEnabled: policy.externalDeliveryEnabled,
    emailProvider: policy.emailProvider,
    emailRecipients: policy.emailRecipients,
    failureAlertMode: policy.failureAlertMode,
    failureAlertTargets: policy.failureAlertTargets,
    policyPath: policy.policyPath,
    overrideLoaded: policy.overrideLoaded,
    latestHistoryDate: latestSnapshot?.date || null,
    freshness,
    lifecycleSummary,
    brokerErrorState,
    fillNotificationState,
    pendingActions,
    ready: pendingActions.length === 0,
  };
}

module.exports = {
  defaultDeliveryPolicy,
  effectiveDeliveryPolicy,
  reportPendingActions,
  reportDeliveryStatus,
};
