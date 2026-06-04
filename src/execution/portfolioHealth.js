const path = require('path');
const { getInteractiveBrokersReadiness } = require('../brokers/interactive-brokers/readiness');
const { brokerErrorStatus } = require('./runtimeState');
const { summarizeOpenRunnerRetryState, staleApprovalInventory } = require('./tradeState');
const { reportDeliveryStatus } = require('../reporting/deliveryPolicy');
const { loadFillNotificationState } = require('../reporting/fillNotificationState');
const { fetchCronHealth } = require('../reporting/cronJobsFetcher');
const { classifySymptoms, applyHealRecipes, buildOpenIssues } = require('./selfHeal');
const { getRecoveryLadder } = require('./recoveryLadder');

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

  // Derive canonical state (Phase A — single source of truth for email gate + UI)
  // state: 'healthy' | 'watch' | 'attention' | 'critical'
  // summary: one-sentence human explanation
  // canonicalNextAction: null (no action needed) | string (concrete instruction)
  let state = 'healthy';
  let summary = 'All systems normal.';
  let canonicalNextAction = null;

  const hasCriticalBlocker = blockers.some(function(b) {
    return b.code === 'broker_automation_paused' || b.code === 'broker_unready';
  });

  if (hasCriticalBlocker) {
    state = 'critical';
    summary = blockers.find(function(b) { return b.code === 'broker_automation_paused' || b.code === 'broker_unready'; }).message;
    canonicalNextAction = recommendedActions[0] || null;
  } else if (blockers.length > 0) {
    state = 'attention';
    summary = blockers[0].message;
    canonicalNextAction = recommendedActions[0] || null;
    // If the leading blocker is about awaiting reconcile, provide a concrete command
    // instead of leaving the operator with no actionable next step.
    if (!canonicalNextAction && /sync-portfolio-order-status to reconcile/i.test(summary)) {
      canonicalNextAction = 'For each unreconciled broker order id, run: node scripts/sync-portfolio-order-status.js <portfolio-dir> <order-id>';
    }
  } else if (health !== 'healthy') {
    state = 'watch';
    summary = 'Minor signals detected; monitoring.';
    canonicalNextAction = null;
  }

  return {
    health,
    severity,
    state,
    summary,
    canonicalNextAction,
    blockerCount: blockers.length,
    blockers,
    recommendedActions: Array.from(new Set(recommendedActions)),
    nextAction: recommendedActions[0] || 'No immediate operator action is required.',
  };
}

async function buildSelfHealPlan({ portfolioDir, repoRoot = process.cwd(), now = new Date(), cronHealth = null, dryRun = true }) {
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
  const resolvedCronHealth = cronHealth || fetchCronHealth();
  const classified = classifySymptoms({ brokerReadiness, deliveryStatus, cronHealth: resolvedCronHealth, errorState });
  const healed = applyHealRecipes(classified, { now, repoRoot, dryRun });
  const openIssues = buildOpenIssues({ classified, healed });

  const actions = [];
  if (errorState.stopAutomation) actions.push({ kind: 'manual', command: null, reason: 'Broker automation is paused; inspect and clear the broker error state intentionally.' });
  if (brokerReadiness?.fallbackRequired || brokerReadiness?.reachable === false || brokerReadiness?.authenticated === false) actions.push({ kind: 'command', command: 'node scripts/trade.js reconcile-live portfolio/etf --json', reason: 'Rebuild truthful broker evidence once native connectivity is available.' });
  if (staleApprovedRows.length > 0) actions.push({ kind: 'command', command: 'node scripts/trade.js propose portfolio/etf', reason: 'Regenerate fresh proposal rows before approving the latest row only.' });
  if ((retryState.queuedRetry || 0) > 0) actions.push({ kind: 'command', command: 'node scripts/trade.js requeue-open portfolio/etf --all', reason: 'Hand retryable rows back to the market-open runner only after recovery.' });
  if ((fillNotificationState.reconciledUnnotifiedFills || []).length > 0) actions.push({ kind: 'command', command: 'node scripts/trade.js delivery portfolio/etf', reason: 'Review reconciled fills pending notification backfill.' });

  // Build a deduped list of recovery ladders for surfaced categories.
  // Sources: classified symptoms + trade-level blocker codes. Empty ladders are dropped.
  const ladderCategories = new Set();
  for (const item of classified) {
    if (item && item.category) ladderCategories.add(item.category);
  }
  for (const blocker of health.blockers || []) {
    if (blocker && blocker.code) ladderCategories.add(blocker.code);
  }
  const recoveryLadders = [];
  for (const category of ladderCategories) {
    const ladder = getRecoveryLadder(category);
    if (ladder.length > 0) recoveryLadders.push({ category, ladder });
  }

  return {
    ok: true,
    dryRun,
    portfolio,
    health,
    classified,
    healed,
    openIssues,
    actions,
    recoveryLadders,
  };
}

module.exports = { classifyPortfolioHealth, buildSelfHealPlan };
