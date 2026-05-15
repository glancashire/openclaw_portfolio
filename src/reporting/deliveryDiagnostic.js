'use strict';

const fs = require('fs');
const path = require('path');
const { effectiveDeliveryPolicy, reportDeliveryStatus } = require('./deliveryPolicy');
const { emailDeliveryReadiness } = require('./emailDelivery');
const { listBlockedTradeRows } = require('./summaryArtifacts');

function evaluateDeliveryPosture({ portfolioDir, generationMeta = null, workflow = null } = {}) {
  if (!portfolioDir) throw new Error('portfolioDir is required');

  const status = reportDeliveryStatus({ portfolioDir, generationMeta, workflow });
  const policy = effectiveDeliveryPolicy(portfolioDir);
  const emailReadiness = emailDeliveryReadiness(policy, status);
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const brokerBlockRows = fs.existsSync(tradesPath) ? listBlockedTradeRows(tradesPath) : [];

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    portfolio: path.basename(portfolioDir),
    policy: {
      deliveryMode: policy.deliveryMode,
      intendedChannels: policy.intendedChannels,
      externalDeliveryEnabled: policy.externalDeliveryEnabled,
      emailProvider: policy.emailProvider,
      emailRecipients: policy.emailRecipients,
      failureAlertMode: policy.failureAlertMode,
      failureAlertTargets: policy.failureAlertTargets,
      pendingActionThresholds: policy.pendingActionThresholds,
      notes: policy.notes,
      policyPath: policy.policyPath,
      overrideLoaded: policy.overrideLoaded,
    },
    status,
    emailDelivery: emailReadiness,
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
      brokerBlockContext: {
        blockedTradeCount: brokerBlockRows.length,
        topBrokerBlock: brokerBlockRows.length ? {
          tickerOrIsin: brokerBlockRows[0].tickerOrIsin || '',
          name: brokerBlockRows[0].name || '',
          blockCode: brokerBlockRows[0].blockCode || '',
          blockReason: brokerBlockRows[0].blockReason || '',
          nextAction: brokerBlockRows[0].nextAction || '',
          brokerOrderId: brokerBlockRows[0].brokerOrderId || '',
        } : null,
      },
      recommendedNextAction: status.ready
        ? (emailReadiness.enabled && !emailReadiness.ready ? emailReadiness.reason : 'No delivery-side operator action is currently required.')
        : (Array.isArray(status.pendingActions) && status.pendingActions.some((item) => /notification backfill review/i.test(String(item))))
          ? 'Review the reconciled fill notification backfill state and decide whether to record a manual backfill outcome.'
          : (emailReadiness.enabled && !emailReadiness.ready)
            ? emailReadiness.reason
            : 'Review pending delivery actions and clear the underlying reporting or runtime blocker.',
    },
  };
}

module.exports = {
  evaluateDeliveryPosture,
};
