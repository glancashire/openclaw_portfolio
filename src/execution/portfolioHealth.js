const path = require('path');
const { getInteractiveBrokersReadiness } = require('../brokers/interactive-brokers/readiness');
const { brokerErrorStatus } = require('./runtimeState');
const { summarizeOpenRunnerRetryState, staleApprovalInventory } = require('./tradeState');
const { reportDeliveryStatus } = require('../reporting/deliveryPolicy');
const { loadFillNotificationState } = require('../reporting/fillNotificationState');

function classifyPortfolioHealth({ brokerReadiness, errorState, staleApprovedRows, retryState, deliveryStatus, fillNotificationState }) {
  const blockers = [];
  const recommendedActions = [];
  let health = 'healthy';
  let severity = 'low';

  if (errorState?.stopAutomation) {
    health = 'paused';
    severity = 'high';
    blockers.push({ code: 'broker_automation_paused', message: `Broker automation is paused after ${errorState.consecutive} consecutive broker errors.` });
    recommendedActions.push('Clear the broker error state only after the underlying broker/API issue is understood and resolved.');
  }

  if (brokerReadiness?.fallbackRequired || brokerReadiness?.reachable === false || brokerReadiness?.authenticated === false) {
    health = health === 'paused' ? health : 'blocked';
    severity = 'high';
    blockers.push({ code: 'broker_unready', message: brokerReadiness?.message || 'Broker readiness is degraded.' });
    recommendedActions.push('Restore native IBKR connectivity before relying on executable live-state surfaces.');
  }

  if ((staleApprovedRows || []).length > 0) {
    if (health === 'healthy') health = 'degraded';
    if (severity === 'low') severity = 'medium';
    blockers.push({ code: 'stale_approval', message: `${staleApprovedRows.length} approved trade row(s) are stale and need regeneration/reapproval.` });
    recommendedActions.push('Generate a fresh proposal row and approve the regenerated row instead of reusing stale approvals.');
  }

  if (Number(retryState?.queuedRetry || 0) > 0 || Number(retryState?.queuedInitial || 0) > 0) {
    if (health === 'healthy') health = 'degraded';
    if (severity === 'low') severity = 'medium';
    blockers.push({ code: 'open_runner_backlog', message: `${Number(retryState?.queuedInitial || 0)} first-handoff and ${Number(retryState?.queuedRetry || 0)} retry row(s) are waiting on the market-open runner.` });
    recommendedActions.push('Review queued market-open rows and retry only during the intended venue trading session.');
  }

  if ((fillNotificationState?.reconciledUnnotifiedFills || []).length > 0) {
    if (health === 'healthy') health = 'degraded';
    blockers.push({ code: 'fill_notification_backfill', message: `${fillNotificationState.reconciledUnnotifiedFills.length} fill notification(s) still need backfill review.` });
    recommendedActions.push('Review reconciled fills and close the notification backfill backlog.');
  }

  if (Array.isArray(deliveryStatus?.pendingActions) && deliveryStatus.pendingActions.length > 0) {
    if (health === 'healthy') health = 'degraded';
    blockers.push({ code: 'delivery_attention', message: deliveryStatus.pendingActions[0] });
  }

  const summary = {
    health,
    severity,
    blockerCount: blockers.length,
    blockers,
    recommendedActions: Array.from(new Set(recommendedActions)),
    nextAction: recommendedActions[0] || 'No immediate operator action is required.',
  };
  return summary;
}

async function buildSelfHealPlan({ portfolioDir, repoRoot = process.cwd() }) {
  const portfolio = path.basename(portfolioDir);
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const brokerReadiness = await getInteractiveBrokersReadiness();
  const errorState = brokerErrorStatus(portfolio);
  const staleApprovedRows = staleApprovalInventory(tradesPath).map((entry) => ({
    tickerOrIsin: entry.tickerOrIsin,
    action: entry.action,
    canonicalState: 'stale_needs_reapproval',
    approvalAgeHours: entry.approvalAgeHours,
    staleApproval: true,
    reason: entry.reason,
    refreshCommand: entry.refreshCommand,
  }));
  const retryState = summarizeOpenRunnerRetryState(tradesPath);
  const deliveryStatus = reportDeliveryStatus({ portfolioDir });
  const fillNotificationState = loadFillNotificationState(repoRoot);
  const health = classifyPortfolioHealth({ brokerReadiness, errorState, staleApprovedRows, retryState, deliveryStatus, fillNotificationState });

  const actions = [];
  if (errorState.stopAutomation) actions.push({ kind: 'manual', command: null, reason: 'Broker automation is paused; inspect and clear the broker error state intentionally.' });
  if (brokerReadiness?.fallbackRequired || brokerReadiness?.reachable === false || brokerReadiness?.authenticated === false) actions.push({ kind: 'command', command: 'node scripts/trade.js reconcile-live portfolio/etf --json', reason: 'Rebuild truthful broker evidence once native connectivity is available.' });
  if (staleApprovedRows.length > 0) actions.push({ kind: 'command', command: 'node scripts/trade.js propose portfolio/etf', reason: 'Regenerate fresh proposal rows before approving the latest row only.' });
  if ((retryState.queuedRetry || 0) > 0) actions.push({ kind: 'command', command: 'node scripts/trade.js requeue-open portfolio/etf --all', reason: 'Hand retryable rows back to the market-open runner only after recovery.' });
  if ((fillNotificationState.reconciledUnnotifiedFills || []).length > 0) actions.push({ kind: 'command', command: 'node scripts/trade.js delivery portfolio/etf', reason: 'Review reconciled fills pending notification backfill.' });

  return { ok: true, dryRun: true, portfolio, health, actions };
}

module.exports = { classifyPortfolioHealth, buildSelfHealPlan };
