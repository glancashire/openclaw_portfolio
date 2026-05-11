'use strict';

const path = require('path');
const { effectiveDeliveryPolicy, reportDeliveryStatus } = require('./deliveryPolicy');

function evaluateDeliveryPosture({ portfolioDir, generationMeta = null, workflow = null } = {}) {
  if (!portfolioDir) throw new Error('portfolioDir is required');

  const status = reportDeliveryStatus({ portfolioDir, generationMeta, workflow });
  const policy = effectiveDeliveryPolicy(portfolioDir);

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    portfolio: path.basename(portfolioDir),
    policy: {
      deliveryMode: policy.deliveryMode,
      intendedChannels: policy.intendedChannels,
      externalDeliveryEnabled: policy.externalDeliveryEnabled,
      failureAlertMode: policy.failureAlertMode,
      failureAlertTargets: policy.failureAlertTargets,
      pendingActionThresholds: policy.pendingActionThresholds,
      notes: policy.notes,
      policyPath: policy.policyPath,
      overrideLoaded: policy.overrideLoaded,
    },
    status,
    deliveryPosture: {
      ready: Boolean(status.ready),
      pendingActionCount: Array.isArray(status.pendingActions) ? status.pendingActions.length : 0,
      latestHistoryDate: status.latestHistoryDate,
      freshnessStale: Boolean(status.freshness?.stale),
      failedTrades: Number(status.lifecycleSummary?.failed || 0),
      inFlightOrders:
        Number(status.lifecycleSummary?.staged || 0)
        + Number(status.lifecycleSummary?.submitted || 0)
        + Number(status.lifecycleSummary?.partiallyFilled || 0),
      brokerAutomationPaused: Boolean(status.brokerErrorState?.stopAutomation),
      recommendedNextAction: status.ready
        ? 'No delivery-side operator action is currently required.'
        : (Array.isArray(status.pendingActions) && status.pendingActions.some((item) => /notification backfill review/i.test(String(item))))
          ? 'Review the reconciled fill notification backfill state and decide whether to record a manual backfill outcome.'
          : 'Review pending delivery actions and clear the underlying reporting or runtime blocker.',
    },
  };
}

module.exports = {
  evaluateDeliveryPosture,
};
