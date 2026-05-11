const fs = require('fs');
const path = require('path');
const { analyzeAllocation } = require('../analysis/allocationAnalysis');
const { readApprovedInstruments } = require('../analysis/approvedInstruments');
const { buildExecutionPlan } = require('../analysis/executionPlan');
const { recentTrades, latestTradeProposals, latestHistory, executionLifecycleSummary } = require('./portfolioData');
const { getInteractiveBrokersReadiness } = require('../brokers/interactive-brokers/readiness');
const { brokerErrorStatus } = require('../execution/runtimeState');
const { reportDeliveryStatus } = require('./deliveryPolicy');
const { fileFreshnessSummary } = require('./freshness');
const { readRuntimeEvents, summarizeRuntimeEvents } = require('../observability/runtimeEvents');
const { evaluateSafetyControls } = require('../validation/safetyControls');
const { markdownToBasicHtml } = require('./pdfExport');
const { buildPendingOperatorActions, buildMaterialEvents, bestNextStep, formatRecommendedStep } = require('./dashboardGenerator');
const { classifyActionSeverity, queueTypeForItem, summarizeOperatorQueue } = require('./operatorQueue');
const { readTradesTable, summarizeOpenRunnerRetryState } = require('../execution/tradeState');

function explainAllocationRow(row = {}) {
  const assetClass = row.assetClass || 'This sleeve';
  const driftPct = Number(row.driftPct ?? row.drift ?? 0);
  const targetPct = Number(row.targetPct ?? row.target ?? 0);
  const direction = driftPct < 0 ? 'under target' : driftPct > 0 ? 'over target' : 'on target';
  if (row.status === 'out_of_bounds') return `${assetClass} is ${Math.abs(driftPct)}% ${direction} and outside the allowed band around the ${targetPct}% target.`;
  if (row.status === 'drifted') return `${assetClass} is ${Math.abs(driftPct)}% ${direction}, but still within a softer drift posture that should be monitored.`;
  return `${assetClass} is currently aligned closely enough with the ${targetPct}% target.`;
}

function explainNoTradePosture({ latestProposals = [], brokerReadiness = null, lifecycleSummary = null, freshness = null }) {
  if (brokerReadiness?.fallbackRequired) return `No live-ready trade path is available because broker readiness is degraded: ${brokerReadiness.message}`;
  if (freshness?.stale) return 'Execution should stay blocked because the supporting dashboard/holdings inputs are stale.';
  if ((lifecycleSummary?.proposed || 0) === 0 && (latestProposals || []).length === 0) return 'No trade was proposed because there is currently no executable proposal set to review.';
  return 'Trade posture is driven by the current proposal and approval state.';
}

function explainExecutionBlock({ brokerReadiness = null, freshness = null, blockers = [], lifecycleSummary = null }) {
  if (blockers.length > 0) return `Execution is blocked because ${blockers[0].message}`;
  if (freshness?.stale) return 'Execution is blocked because the underlying portfolio state is stale and should be refreshed first.';
  if (brokerReadiness?.fallbackRequired) return `Execution is blocked because broker readiness is degraded: ${brokerReadiness.message}`;
  if ((lifecycleSummary?.proposed || 0) > 0) return 'Execution is waiting on explicit operator approval of proposed trade rows.';
  return 'No explicit execution block is currently surfaced.';
}

function explainApprovalBacklog(lifecycleSummary = {}, tradeStateSummary = {}) {
  const pending = Number(lifecycleSummary?.proposed || 0) + Number(lifecycleSummary?.approved || 0);
  const queued = Number(tradeStateSummary?.queuedForOpenRunner || 0);
  const blocked = Number(tradeStateSummary?.blocked || 0);
  if (pending > 0 || queued > 0 || blocked > 0) {
    const parts = [];
    if (pending > 0) parts.push(`${pending} approval-gated trade row(s)`);
    if (queued > 0) parts.push(`${queued} queued-for-open-runner row(s)`);
    if (blocked > 0) parts.push(`${blocked} blocked row(s)`);
    return `${parts.join(', ')} still need explicit operator review before the workflow can advance cleanly.`;
  }
  return 'There is no active approval backlog.';
}

function summarizeTradeStateRows(tradesPath) {
  if (!tradesPath || !fs.existsSync(tradesPath)) {
    return { queuedForOpenRunner: 0, blocked: 0, blockedByCode: {} };
  }
  const { rows } = readTradesTable(tradesPath);
  const summary = { queuedForOpenRunner: 0, blocked: 0, blockedByCode: {} };
  for (const row of rows) {
    const approval = String(row.Approval || '').trim();
    const blockCode = String(row['Block code'] || '').trim();
    const orderId = String(row['Broker order id'] || '').trim();
    if (approval === 'queued_for_open_runner' && !orderId) summary.queuedForOpenRunner += 1;
    if (blockCode) {
      summary.blocked += 1;
      summary.blockedByCode[blockCode] = (summary.blockedByCode[blockCode] || 0) + 1;
    }
  }
  return summary;
}

function parseHoldingsSummary(text) {
  const get = (label) => {
    const m = text.match(new RegExp(`- ${label}:\\s*(.+)`));
    return m ? m[1].trim() : '0';
  };
  return {
    totalValue: get('Total value CHF'),
    cash: get('Cash CHF'),
    invested: get('Invested value CHF'),
    syncTime: get('Date/time'),
    source: get('Source'),
    broker: get('Broker'),
    baseCurrency: get('Base currency'),
  };
}

function countHoldingRows(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '## Current Holdings');
  if (start === -1) return 0;
  let count = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) break;
    if (line.startsWith('|') && !line.includes('---') && !line.includes('Ticker / ISIN')) count += 1;
  }
  return count;
}

function strategyStatus(allocations, brokerReadiness, blockers = []) {
  if (blockers.length > 0 || brokerReadiness?.fallbackRequired) return 'blocked';
  if (allocations.some((row) => row.status === 'out_of_bounds')) return 'rebalance_needed';
  if (allocations.some((row) => row.status === 'drifted')) return 'minor_drift';
  return 'on_track';
}

function healthLabel({ brokerReadiness, brokerErrorState, freshness, blockers = [], lifecycleSummary = {}, pendingActions = [] }) {
  if (brokerErrorState?.stopAutomation) return 'blocked';
  if (blockers.length > 0) return 'warning';
  if (brokerReadiness?.fallbackRequired) return 'warning';
  if (freshness?.stale) return 'warning';
  if ((lifecycleSummary?.failed || 0) > 0) return 'warning';
  if (pendingActions.length > 0) return 'attention_needed';
  return 'healthy';
}

function latestProposalByInstrument(latestProposals = []) {
  const map = new Map();
  for (const proposal of latestProposals) {
    map.set(proposal.tickerOrIsin, proposal);
  }
  return map;
}

function proposalSummary(latestProposals = [], totalValue = 0) {
  const plannedCashSleeve = latestProposals
    .filter((proposal) => proposal.tickerOrIsin === 'CASH-CHF' || proposal.action === 'hold')
    .reduce((sum, proposal) => sum + Number(proposal.estimatedChf || 0), 0);

  const executableBuys = latestProposals
    .filter((proposal) => proposal.action === 'buy')
    .reduce((sum, proposal) => sum + Number(proposal.estimatedChf || proposal.amount || 0), 0);

  const residualTradableCash = Number((totalValue - plannedCashSleeve - executableBuys).toFixed(2));
  return {
    plannedCashSleeve,
    executableBuys,
    residualTradableCash: residualTradableCash > 0 ? residualTradableCash : 0,
  };
}


function recommendedActions(existingTrades = [], latestProposals = [], totalValue = 0, brokerReadiness = null, lifecycleSummary = null) {
  if (brokerReadiness?.fallbackRequired) {
    return [
      'Restore Interactive Brokers read-only connectivity before relying on broker-backed pricing or conid resolution.',
      'Keep proposals in dry-run mode and treat current order sizing as draft-only until broker connectivity is healthy.',
    ];
  }

  if ((lifecycleSummary?.staged || 0) > 0 || (lifecycleSummary?.submitted || 0) > 0 || (lifecycleSummary?.partiallyFilled || 0) > 0) {
    return [
      'Monitor staged, submitted, and partially filled orders before generating fresh proposals.',
      'Reconcile broker order status back into trades, holdings, and history before acting on new execution plans.',
    ];
  }

  if ((lifecycleSummary?.approved || 0) > 0) {
    return [
      'Stage or review approved trades when broker readiness is healthy and confirmation gates are satisfied.',
      'Keep unapproved proposals separate from broker-ready approved trades to avoid execution confusion.',
    ];
  }

  if (!existingTrades.length) {
    return [
      'Generate initial dry-run instrument proposals from the current cash balance.',
      'Refresh history snapshots after holdings updates and trade execution.',
    ];
  }

  const hasCashHold = existingTrades.some((trade) => trade.instrument === 'CHF cash balance' || trade.action === 'hold');
  const summary = proposalSummary(latestProposals, totalValue);
  return [
    'Review and approve the current dry-run instrument proposals before broker connectivity is enabled.',
    hasCashHold
      ? `Keep the defensive sleeve in CHF cash for now, and leave residual tradable cash of CHF ${summary.residualTradableCash} unallocated until live pricing is available.`
      : 'Refresh history snapshots after holdings updates and trade execution.',
  ];
}

function buildPendingActionItems({ portfolioName, deliveryStatus = null, brokerReadiness = null, brokerErrorState = null, lifecycleSummary = null, tradeStateSummary = null, openRunnerRetryState = null, safetyDiagnostics = null, fillNotificationState = null, recommended = [], latestProposals = [] }) {
  const actions = [];
  const blockers = safetyDiagnostics?.blockers || [];

  for (const blocker of blockers) {
    actions.push({
      portfolio: portfolioName,
      kind: 'blocker',
      severity: blocker.severity === 'error' ? 'high' : 'medium',
      status: blocker.severity === 'error' ? 'blocked' : 'warning',
      summary: blocker.message || String(blocker),
      blocking: blocker.severity === 'error',
      recommendedOperatorAction: blocker.severity === 'error' ? 'Resolve the blocking condition before proceeding.' : 'Review the warning and confirm intended posture.',
      source: 'safety_controls',
    });
  }

  const unnotifiedFillCount = Number(fillNotificationState?.reconciledUnnotifiedFills?.length || 0);
  for (const item of deliveryStatus?.pendingActions || []) {
    const summary = String(item || '');
    if (unnotifiedFillCount > 0 && /notification backfill review/i.test(summary)) continue;
    actions.push({
      portfolio: portfolioName,
      kind: 'delivery',
      severity: 'medium',
      status: 'pending',
      summary,
      blocking: false,
      recommendedOperatorAction: 'Review report delivery readiness and clear the pending action.',
      source: 'delivery_policy',
    });
  }

  if (brokerReadiness?.fallbackRequired) {
    actions.push({
      portfolio: portfolioName,
      kind: 'broker',
      severity: 'high',
      status: 'degraded',
      summary: brokerReadiness.message,
      blocking: true,
      recommendedOperatorAction: 'Restore broker connectivity before relying on broker-backed pricing or live execution paths.',
      source: 'broker_readiness',
    });
  }

  if (brokerErrorState?.stopAutomation) {
    actions.push({
      portfolio: portfolioName,
      kind: 'broker',
      severity: 'high',
      status: 'paused',
      summary: `Broker automation paused after ${brokerErrorState.consecutive} consecutive errors.`,
      blocking: true,
      recommendedOperatorAction: 'Investigate broker errors and clear the pause state before resuming automation.',
      source: 'runtime_state',
    });
  }

  if ((lifecycleSummary?.approved || 0) > 0) {
    actions.push({
      portfolio: portfolioName,
      kind: 'approval',
      severity: 'medium',
      status: 'ready_for_review',
      summary: `${lifecycleSummary.approved} approved trade row(s) are ready for staging or review.`,
      blocking: false,
      recommendedOperatorAction: 'Stage or review the approved trades when readiness gates are satisfied.',
      source: 'trade_lifecycle',
    });
  }

  if ((lifecycleSummary?.proposed || 0) > 0) {
    actions.push({
      portfolio: portfolioName,
      kind: 'approval',
      severity: 'medium',
      status: 'pending_user_approval',
      summary: `${lifecycleSummary.proposed} proposed trade row(s) still need user approval.`,
      blocking: false,
      recommendedOperatorAction: 'Review the proposed trades and approve or reject them explicitly.',
      source: 'trade_lifecycle',
    });
  }

  if (unnotifiedFillCount > 0) {
    actions.push({
      portfolio: portfolioName,
      kind: 'delivery',
      queueType: 'backfill_review',
      severity: 'medium',
      status: 'backfill_review',
      summary: `${unnotifiedFillCount} reconciled fill(s) were detected after the live window and still need notification backfill review.`,
      blocking: false,
      recommendedOperatorAction: 'Review the reconciled fill notification backfill state and decide whether to record a manual backfill outcome.',
      source: 'fill_notification_state',
    });
  }

  const queuedInitial = Number(openRunnerRetryState?.queuedInitial || 0);
  const queuedRetry = Number(openRunnerRetryState?.queuedRetry || 0);
  if (queuedInitial > 0) {
    actions.push({
      portfolio: portfolioName,
      kind: 'execution',
      queueType: 'open_runner_queue',
      severity: 'medium',
      status: 'ready_for_review',
      summary: `${queuedInitial} trade row(s) are queued for a first market-open handoff.`,
      blocking: false,
      recommendedOperatorAction: 'Confirm the queued rows are still intended before the next market-open run.',
      source: 'trade_state',
    });
  }
  if (queuedRetry > 0) {
    actions.push({
      portfolio: portfolioName,
      kind: 'execution',
      queueType: 'open_runner_retry',
      severity: 'medium',
      status: 'ready_for_review',
      summary: `${queuedRetry} trade row(s) were requeued for market-open retry after operator recovery.`,
      blocking: false,
      recommendedOperatorAction: 'Re-check the prior blocker cause before allowing the retry handoff to proceed.',
      source: 'trade_state',
    });
  }
  const inflight = Number(lifecycleSummary?.staged || 0) + Number(lifecycleSummary?.submitted || 0) + Number(lifecycleSummary?.partiallyFilled || 0);
  if (inflight > 0) {
    actions.push({
      portfolio: portfolioName,
      kind: 'execution',
      severity: 'medium',
      status: 'in_flight',
      summary: `${inflight} in-flight execution row(s) need reconciliation before overlapping actions.`,
      blocking: false,
      recommendedOperatorAction: 'Reconcile broker order status before creating overlapping execution plans.',
      source: 'trade_lifecycle',
    });
  }

  if ((lifecycleSummary?.failed || 0) > 0) {
    actions.push({
      portfolio: portfolioName,
      kind: 'execution',
      severity: 'high',
      status: 'failed',
      summary: `${lifecycleSummary.failed} trade row(s) are marked failed and need operator review.`,
      blocking: true,
      recommendedOperatorAction: 'Review the failed trade rows and resolve the root cause before retrying.',
      source: 'trade_lifecycle',
    });
  }

  if (safetyDiagnostics?.diagnostics?.holdingsHealth?.stalePricing || safetyDiagnostics?.holdingsHealth?.stalePricing) {
    actions.push({
      portfolio: portfolioName,
      kind: 'data',
      severity: 'high',
      status: 'stale',
      summary: 'Holdings or pricing data is marked stale by safety diagnostics.',
      blocking: true,
      recommendedOperatorAction: 'Refresh holdings and pricing before relying on any recommendation or execution path.',
      source: 'safety_controls',
    });
  }

  if (!actions.length && recommended[0]) {
    actions.push({
      portfolio: portfolioName,
      kind: 'workflow',
      severity: classifyActionSeverity({ kind: 'workflow', blocking: false }),
      status: 'recommended',
      summary: recommended[0],
      blocking: false,
      recommendedOperatorAction: recommended[0],
      source: 'recommendation_engine',
    });
  }

  const deduped = [];
  const seen = new Set();
  for (const item of actions) {
    const key = `${item.kind}::${item.status}::${item.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped.sort((a, b) => {
    const severityRank = { high: 0, medium: 1, low: 2 };
    const statusRank = { blocked: 0, backfill_review: 1, degraded: 2, paused: 3, failed: 4, pending_user_approval: 5, ready_for_review: 6, in_flight: 7, pending: 8, stale: 9, warning: 10, recommended: 11 };
    return (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99)
      || (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99)
      || a.summary.localeCompare(b.summary);
  });
}

function buildPortfolioSummaryModel({ portfolioName, tradesPath = null, holdingsText, allocations = [], approvedInstruments = [], existingTrades = [], latestProposals = [], executionPlan = null, latestSnapshot = null, brokerReadiness = null, lifecycleSummary = null, freshness = null, brokerErrorState = null, deliveryStatus = null, observability = null, safetyDiagnostics = null, recentEvents = [], readiness = null }) {
  const summary = parseHoldingsSummary(holdingsText);
  const totalValue = Number(summary.totalValue || 0);
  const holdingCount = countHoldingRows(holdingsText);
  const blockers = safetyDiagnostics?.blockers || [];
  const tradeStateSummary = summarizeTradeStateRows(tradesPath);
  const openRunnerRetryState = summarizeOpenRunnerRetryState(tradesPath);
  const latestActions = recommendedActions(existingTrades, latestProposals, totalValue, brokerReadiness, lifecycleSummary);
  const pendingActions = buildPendingActionItems({
    portfolioName,
    deliveryStatus,
    brokerReadiness,
    brokerErrorState,
    lifecycleSummary,
    tradeStateSummary,
    openRunnerRetryState,
    safetyDiagnostics,
    fillNotificationState: deliveryStatus?.fillNotificationState || null,
    recommended: latestActions,
    latestProposals,
  });
  const health = healthLabel({ brokerReadiness, brokerErrorState, freshness, blockers, lifecycleSummary, pendingActions });
  const strategy = strategyStatus(allocations, brokerReadiness, blockers);
  const proposalTotals = proposalSummary(latestProposals, totalValue);
  const proposalByInstrument = latestProposalByInstrument(latestProposals);
  const recommendedNextStep = formatRecommendedStep(bestNextStep({
    pendingActions,
    blockers,
    recommendedActionsList: latestActions,
    brokerReadiness,
    lifecycleSummary,
  }));
  const materialEvents = buildMaterialEvents(recentEvents);
  const explanationSummary = {
    biggestDrift: allocations.length
      ? explainAllocationRow(allocations.slice().sort((a, b) => Math.abs(Number(b.drift || 0)) - Math.abs(Number(a.drift || 0)))[0])
      : 'No allocation drift explanation is available.',
    noTradePosture: explainNoTradePosture({ latestProposals, brokerReadiness, lifecycleSummary, freshness }),
    executionBlock: explainExecutionBlock({ brokerReadiness, freshness, blockers, lifecycleSummary }),
    approvalBacklog: explainApprovalBacklog(lifecycleSummary, tradeStateSummary),
  };

  const operatorQueueSummary = summarizeOperatorQueue(pendingActions);

  return {
    schemaVersion: '1.1',
    generatedAt: new Date().toISOString(),
    portfolio: portfolioName,
    status: {
      health,
      strategy,
      brokerHealth: brokerReadiness?.fallbackRequired ? 'degraded' : 'healthy',
      brokerMessage: brokerReadiness?.message || 'unknown',
      executionPosture: brokerErrorState?.stopAutomation ? 'paused' : (brokerReadiness?.fallbackRequired ? 'degraded_dry_run_only' : 'ready_for_review'),
      deliveryPosture: deliveryStatus?.ready ? 'ready' : 'needs_operator_attention',
      dataFreshness: freshness?.stale ? 'stale' : 'current',
    },
    readiness: readiness ? {
      ok: Boolean(readiness.ok),
      executionMode: readiness.executionMode || null,
      armedForMarketOpen: Boolean(readiness.armedForMarketOpen),
      armExpiresAt: readiness.armExpiresAt || null,
      recommendedNextAction: readiness.recommendedNextAction || null,
      blockerCount: Array.isArray(readiness.blockers) ? readiness.blockers.length : 0,
      warningCount: Array.isArray(readiness.warnings) ? readiness.warnings.length : 0,
      marketOpenNow: Boolean(readiness.marketWindow?.openNow),
    } : null,
    holdings: {
      totalValueChf: totalValue,
      cashChf: Number(summary.cash || 0),
      investedChf: Number(summary.invested || 0),
      holdingCount,
      baseCurrency: summary.baseCurrency || 'CHF',
      lastSyncAt: summary.syncTime || null,
      source: summary.source || 'unknown',
      latestSnapshotDate: latestSnapshot?.date || null,
      dailyChangeChf: Number(latestSnapshot?.dailyChange || 0),
      dailyChangePct: Number(latestSnapshot?.dailyChangePct || 0),
    },
    approvals: {
      proposedCount: Number(lifecycleSummary?.proposed || 0),
      approvedCount: Number(lifecycleSummary?.approved || 0),
      pendingApprovalCount: Number(lifecycleSummary?.proposed || 0) + Number(lifecycleSummary?.approved || 0),
    },
    operatorQueue: {
      summary: operatorQueueSummary,
      items: pendingActions.map((item, index) => ({
        rank: index + 1,
        queueType: queueTypeForItem(item),
        ...item,
      })),
    },
    blockers: {
      count: blockers.length,
      items: blockers.map((item) => ({ severity: item.severity || 'info', message: item.message || String(item) })),
    },
    execution: {
      lifecycle: lifecycleSummary || {},
      tradeState: tradeStateSummary,
      openRunnerRetryState,
      inFlightCount: Number(lifecycleSummary?.staged || 0) + Number(lifecycleSummary?.submitted || 0) + Number(lifecycleSummary?.partiallyFilled || 0),
      failedCount: Number(lifecycleSummary?.failed || 0),
      plan: executionPlan || { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
      proposalTotals,
    },
    allocation: allocations.map((row) => ({
      assetClass: row.assetClass,
      currentPct: Number(row.current || 0),
      targetPct: Number(row.target || 0),
      driftPct: Number(row.drift || 0),
      minPct: Number(row.min || 0),
      maxPct: Number(row.max || 0),
      status: row.status,
    })),
    instruments: approvedInstruments.map((instrument) => {
      const proposal = proposalByInstrument.get(instrument.tickerOrIsin);
      return {
        tickerOrIsin: instrument.tickerOrIsin,
        name: instrument.name,
        assetClass: instrument.assetClass,
        targetPct: Number(instrument.target || 0),
        minPct: Number(instrument.min || 0),
        maxPct: Number(instrument.max || 0),
        exchange: instrument.exchange,
        currency: instrument.currency,
        latestProposal: proposal ? {
          status: proposal.status,
          action: proposal.action,
          estimatedChf: Number(proposal.estimatedChf || 0),
          approval: proposal.approval || '',
          reason: proposal.reason || '',
        } : null,
      };
    }),
    pendingActions: pendingActions.map((item) => item.summary),
    recommendedNextStep,
    readiness,
    explanations: explanationSummary,
    recentMaterialEvents: materialEvents,
    observability: {
      eventsPresent: observability?.eventsPathPresent || false,
      recentSummary: observability?.recentSummary || summarizeRuntimeEvents([]),
    },
    delivery: {
      ready: Boolean(deliveryStatus?.ready),
      mode: deliveryStatus?.deliveryMode || 'unknown',
      failureAlertMode: deliveryStatus?.failureAlertMode || 'unknown',
      pendingActions: deliveryStatus?.pendingActions || [],
    },
    runtimeState: {
      brokerAutomationPaused: Boolean(brokerErrorState?.stopAutomation),
      consecutiveBrokerErrors: Number(brokerErrorState?.consecutive || 0),
      lastBrokerErrorReason: brokerErrorState?.lastReason || null,
      lastBrokerErrorAt: brokerErrorState?.lastAt || null,
    },
    recentTrades: existingTrades,
  };
}

async function collectPortfolioSummary({ portfolioDir, readiness = null }) {
  const portfolioName = path.basename(portfolioDir);
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const historyPath = path.join(portfolioDir, 'history.md');
  const dashboardPath = path.join(portfolioDir, 'dashboard.md');
  const holdingsText = fs.readFileSync(holdingsPath, 'utf8');
  const allocations = analyzeAllocation({ portfolioPath, holdingsPath });
  const approvedInstruments = readApprovedInstruments(portfolioPath);
  const latestProposals = latestTradeProposals(tradesPath);
  const brokerReadiness = await getInteractiveBrokersReadiness({ portfolio: portfolioName });
  const sourcePaths = [portfolioPath, holdingsPath, tradesPath, historyPath];
  const currentBrokerErrorState = brokerErrorStatus(portfolioName);
  const safetyEvaluation = evaluateSafetyControls({ portfolioPath, holdingsPath });
  const recentEvents = readRuntimeEvents({ portfolio: portfolioName, limit: 100 });
  const observability = {
    eventsPathPresent: recentEvents.length > 0,
    recentSummary: summarizeRuntimeEvents(recentEvents),
  };
  const freshness = fileFreshnessSummary({ dashboardPath, sourcePaths });
  const deliveryStatus = reportDeliveryStatus({ portfolioDir });
  return buildPortfolioSummaryModel({
    portfolioName,
    tradesPath,
    holdingsText,
    allocations,
    approvedInstruments,
    existingTrades: recentTrades(tradesPath),
    latestProposals,
    executionPlan: buildExecutionPlan({ portfolioPath, tradesPath, totalValue: Number(parseHoldingsSummary(holdingsText).totalValue || 0) }),
    latestSnapshot: latestHistory(historyPath),
    brokerReadiness,
    lifecycleSummary: executionLifecycleSummary(tradesPath, { actionableOnly: true }),
    freshness,
    brokerErrorState: currentBrokerErrorState,
    deliveryStatus,
    observability,
    safetyDiagnostics: safetyEvaluation,
    recentEvents,
    readiness,
  });
}

function buildRecoveryChecklist(summary = {}) {
  const queueItems = Array.isArray(summary.operatorQueue?.items) ? summary.operatorQueue.items : [];
  const blockers = Array.isArray(summary.blockers?.items) ? summary.blockers.items : [];
  const events = Array.isArray(summary.recentMaterialEvents) ? summary.recentMaterialEvents : [];
  const incidentDrivers = [];

  if (summary.status?.brokerHealth === 'degraded') {
    incidentDrivers.push('Broker readiness is degraded, so broker-backed pricing/execution paths should be treated as unavailable until recovered.');
  }
  if (summary.status?.dataFreshness === 'stale') {
    incidentDrivers.push('Data freshness is stale, so recommendations and execution paths should be treated as suspect until refreshed.');
  }
  if (summary.runtimeState?.brokerAutomationPaused) {
    incidentDrivers.push('Broker automation is paused after repeated errors and needs explicit operator recovery.');
  }
  if ((summary.approvals?.pendingApprovalCount || 0) > 0) {
    incidentDrivers.push(`${summary.approvals.pendingApprovalCount} approval-gated trade rows are still waiting for operator review.`);
  }
  if (blockers.length > 0) {
    incidentDrivers.push(`${blockers.length} explicit blocker(s) are preventing a healthy operating posture.`);
  }
  if (!incidentDrivers.length) {
    incidentDrivers.push('No active incident drivers were detected; this checklist is a verification pass confirming healthy posture.');
  }

  const derivedActions = queueItems.length
    ? queueItems.map((item, index) => ({
        step: index + 1,
        priority: item.severity || 'low',
        title: item.summary,
        action: item.recommendedOperatorAction || 'Review and resolve as appropriate.',
        verification: item.blocking
          ? 'Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.'
          : 'Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.',
        source: item.source || item.kind || 'operator_queue',
      }))
    : [{
        step: 1,
        priority: 'low',
        title: 'No active recovery actions detected.',
        action: 'Perform a quick verification pass across broker health, freshness, approvals, and recent events.',
        verification: 'Confirm the portfolio remains healthy and no new incident signals have appeared.',
        source: 'operator_queue',
      }];

  const verificationChecks = [
    summary.status?.brokerHealth === 'degraded'
      ? 'Broker health returns to healthy or the operator intentionally keeps the portfolio in draft-only mode.'
      : 'Broker health remains healthy or intentionally degraded with operator awareness.',
    summary.status?.dataFreshness === 'stale'
      ? 'Dashboard, holdings, and summary inputs are refreshed until the stale posture clears.'
      : 'Freshness posture remains current.',
    (summary.approvals?.pendingApprovalCount || 0) > 0
      ? 'All approval-gated rows are explicitly approved, rejected, or intentionally left pending.'
      : 'No approval backlog remains.',
    blockers.length > 0
      ? 'Active blockers are cleared or explicitly documented as accepted constraints.'
      : 'No active blockers remain.',
  ];

  const completionCriteria = blockers.length || queueItems.some((item) => item.blocking)
    ? [
        'Blocking recovery items no longer appear in the operator queue.',
        'Portfolio health no longer depends on unresolved blocker conditions.',
        'The operator can explain the current posture and next operating step without cross-referencing multiple artifacts.',
      ]
    : [
        'Portfolio remains in a healthy or intentionally monitored posture.',
        'No blocker-class recovery work is outstanding.',
        'The next operating step is clear from the summary surface.',
      ];

  return {
    schemaVersion: '1.0',
    generatedAt: summary.generatedAt || new Date().toISOString(),
    portfolio: summary.portfolio || 'unknown',
    incidentStatus: blockers.length || queueItems.some((item) => item.blocking) ? 'action_required' : 'monitor_only',
    summary: {
      health: summary.status?.health || 'unknown',
      brokerHealth: summary.status?.brokerHealth || 'unknown',
      executionPosture: summary.status?.executionPosture || 'unknown',
      deliveryPosture: summary.status?.deliveryPosture || 'unknown',
      dataFreshness: summary.status?.dataFreshness || 'unknown',
      blockerCount: blockers.length,
      queueItemCount: queueItems.length,
      pendingApprovals: summary.approvals?.pendingApprovalCount || 0,
      recommendedNextStep: summary.recommendedNextStep || 'No recommendation available.',
      executionWhy: summary.explanations?.executionBlock || 'No execution explanation available.',
      approvalWhy: summary.explanations?.approvalBacklog || 'No approval explanation available.',
    },
    incidentDrivers,
    activeBlockers: blockers.map((item, index) => ({ rank: index + 1, severity: item.severity || 'info', message: item.message || String(item) })),
    actionChecklist: derivedActions,
    verificationChecks,
    completionCriteria,
    recentSignals: events.slice(0, 5).map((item, index) => ({
      rank: index + 1,
      severity: item.severity || 'info',
      summary: item.summary || item.message || 'event',
      timestamp: item.timestamp || null,
    })),
  };
}

function renderRecoveryChecklistMarkdown(checklist = {}) {
  const drivers = Array.isArray(checklist.incidentDrivers) && checklist.incidentDrivers.length
    ? checklist.incidentDrivers.map((item) => `- ${item}`).join('\n')
    : '- No active incident drivers.';
  const blockers = Array.isArray(checklist.activeBlockers) && checklist.activeBlockers.length
    ? checklist.activeBlockers.map((item, index) => `${index + 1}. [${item.severity}] ${item.message}`).join('\n')
    : '1. No active blockers.';
  const actions = Array.isArray(checklist.actionChecklist) && checklist.actionChecklist.length
    ? checklist.actionChecklist.map((item) => `${item.step}. [${item.priority}] ${item.title}\n   - Action: ${item.action}\n   - Verify: ${item.verification}\n   - Source: ${item.source}`).join('\n')
    : '1. [low] No recovery actions required.\n   - Action: Monitor the portfolio normally.\n   - Verify: Confirm healthy posture.\n   - Source: operator_queue';
  const verification = Array.isArray(checklist.verificationChecks) && checklist.verificationChecks.length
    ? checklist.verificationChecks.map((item) => `- ${item}`).join('\n')
    : '- No verification checks defined.';
  const completion = Array.isArray(checklist.completionCriteria) && checklist.completionCriteria.length
    ? checklist.completionCriteria.map((item) => `- ${item}`).join('\n')
    : '- No completion criteria defined.';
  const recentSignals = Array.isArray(checklist.recentSignals) && checklist.recentSignals.length
    ? checklist.recentSignals.map((item, index) => `${index + 1}. [${item.severity}] ${item.summary}${item.timestamp ? ` (${item.timestamp})` : ''}`).join('\n')
    : '1. No recent signals captured.';

  return `# Recovery Checklist: ${checklist.portfolio || 'unknown'}\n\n## Incident Status\n- Status: ${checklist.incidentStatus || 'unknown'}\n- Health: ${checklist.summary?.health || 'unknown'}\n- Broker health: ${checklist.summary?.brokerHealth || 'unknown'}\n- Execution posture: ${checklist.summary?.executionPosture || 'unknown'}\n- Delivery posture: ${checklist.summary?.deliveryPosture || 'unknown'}\n- Data freshness: ${checklist.summary?.dataFreshness || 'unknown'}\n- Pending approvals: ${checklist.summary?.pendingApprovals || 0}\n- Recommended next step: ${checklist.summary?.recommendedNextStep || 'No recommendation available.'}\n\n## Why This Incident Exists\n- ${checklist.summary?.executionWhy || 'No execution explanation available.'}\n- ${checklist.summary?.approvalWhy || 'No approval explanation available.'}\n\n## Incident Drivers\n${drivers}\n\n## Active Blockers\n${blockers}\n\n## Action Checklist\n${actions}\n\n## Verification Checks\n${verification}\n\n## Completion Criteria\n${completion}\n\n## Recent Signals\n${recentSignals}\n`;
}

function renderPortfolioSummaryMarkdown(summary = {}) {
  const queueItems = Array.isArray(summary.operatorQueue?.items) ? summary.operatorQueue.items : [];
  const blockers = Array.isArray(summary.blockers?.items) ? summary.blockers.items : [];
  const allocationRows = Array.isArray(summary.allocation) ? summary.allocation : [];
  const instrumentRows = Array.isArray(summary.instruments) ? summary.instruments : [];
  const eventRows = Array.isArray(summary.recentMaterialEvents) ? summary.recentMaterialEvents : [];
  const onboarding = summary.onboardingWorkflow || null;

  const queueLines = queueItems.length
    ? queueItems.map((item, index) => `${index + 1}. [${item.queueType || item.kind || 'workflow'}/${item.status}/${item.severity}] ${item.summary} — ${item.recommendedOperatorAction || 'Review and resolve as appropriate.'}`).join('\n')
    : '1. No pending operator queue items.';

  const blockerLines = blockers.length
    ? blockers.map((item, index) => `${index + 1}. [${item.severity || 'info'}] ${item.message}`).join('\n')
    : '1. No active blockers.';

  const allocationTable = allocationRows.length
    ? allocationRows.map((row) => `| ${row.assetClass} | ${row.currentPct} | ${row.targetPct} | ${row.driftPct} | ${row.status} |`).join('\n')
    : '| none | 0 | 0 | 0 | n/a |';

  const instrumentTable = instrumentRows.length
    ? instrumentRows.map((row) => `| ${row.tickerOrIsin} | ${row.name} | ${row.assetClass} | ${row.targetPct} | ${row.latestProposal?.status || 'none'} | ${row.latestProposal?.approval || 'n/a'} |`).join('\n')
    : '| none | none | none | 0 | none | n/a |';

  const eventLines = eventRows.length
    ? eventRows.map((item, index) => `${index + 1}. [${item.severity || 'info'}] ${item.summary || item.message || 'event'}${item.timestamp ? ` (${item.timestamp})` : ''}`).join('\n')
    : '1. No recent material events.';

  const onboardingSection = onboarding
    ? `## Onboarding Workflow\n- Completion: ${onboarding.completionPct}%\n- Answered questions: ${onboarding.answeredCount}/${onboarding.totalQuestions}\n- Pending questions: ${onboarding.pendingCount}\n- Ready for activation-question gate: ${onboarding.readyForActivationQuestions ? 'yes' : 'no'}\n- Next step: ${onboarding.nextStep}\n\n### Onboarding Sections\n${(onboarding.sections || []).length ? onboarding.sections.map((section) => `- ${section.label}: ${section.pendingCount} pending`).join('\n') : '- No pending onboarding sections.'}\n\n` : '';

  return `# Portfolio Summary Page: ${summary.portfolio || 'unknown'}\n\n## Status Snapshot\n- Generated at: ${summary.generatedAt || 'unknown'}\n- Health: ${summary.status?.health || 'unknown'}\n- Strategy status: ${summary.status?.strategy || 'unknown'}\n- Broker health: ${summary.status?.brokerHealth || 'unknown'}\n- Execution posture: ${summary.status?.executionPosture || 'unknown'}\n- Delivery posture: ${summary.status?.deliveryPosture || 'unknown'}\n- Data freshness: ${summary.status?.dataFreshness || 'unknown'}\n- Live readiness: ${summary.readiness ? (summary.readiness.ok ? 'ready' : 'blocked') : 'not-evaluated'}\n- Live arm state: ${summary.readiness ? (summary.readiness.armedForMarketOpen ? `armed until ${summary.readiness.armExpiresAt || 'unknown'}` : 'not armed') : 'not-evaluated'}\n- Live readiness next step: ${summary.readiness?.recommendedNextAction || 'n/a'}\n\n## Why This Portfolio Looks This Way\n- Drift: ${summary.explanations?.biggestDrift || 'No drift explanation available.'}\n- Execution: ${summary.explanations?.executionBlock || 'No execution explanation available.'}\n- Approvals: ${summary.explanations?.approvalBacklog || 'No approval explanation available.'}\n- Trade posture: ${summary.explanations?.noTradePosture || 'No trade-posture explanation available.'}\n\n## Holdings Snapshot\n- Total value CHF: ${summary.holdings?.totalValueChf || 0}\n- Cash CHF: ${summary.holdings?.cashChf || 0}\n- Invested CHF: ${summary.holdings?.investedChf || 0}\n- Holding count: ${summary.holdings?.holdingCount || 0}\n- Last sync: ${summary.holdings?.lastSyncAt || 'unknown'}\n- Latest snapshot date: ${summary.holdings?.latestSnapshotDate || 'unknown'}\n\n## Recommended Next Step\n- ${summary.recommendedNextStep || 'No recommendation available.'}\n\n## Operator Queue Summary\n- Total queue items: ${summary.operatorQueue?.summary?.total || 0}\n- Blocking items: ${summary.operatorQueue?.summary?.blocking || 0}\n- Approval items: ${summary.operatorQueue?.summary?.approvals || 0}\n- Open-runner first handoffs: ${summary.operatorQueue?.summary?.openRunnerQueue || 0}\n- Open-runner retries: ${summary.operatorQueue?.summary?.openRunnerRetry || 0}\n- Recovery items: ${summary.operatorQueue?.summary?.recovery || 0}\n- Warning items: ${summary.operatorQueue?.summary?.warnings || 0}\n\n## Operator Queue Items\n${queueLines}\n\n## Blockers\n${blockerLines}\n\n## Execution Posture\n- Proposed trades: ${summary.approvals?.proposedCount || 0}\n- Approved trades: ${summary.approvals?.approvedCount || 0}\n- Pending approvals: ${summary.approvals?.pendingApprovalCount || 0}\n- Queued for open runner: ${summary.execution?.tradeState?.queuedForOpenRunner || 0}\n- Queued retries: ${summary.execution?.openRunnerRetryState?.queuedRetry || 0}\n- Blocked rows: ${summary.execution?.tradeState?.blocked || 0}\n- In-flight rows: ${summary.execution?.inFlightCount || 0}\n- Failed rows: ${summary.execution?.failedCount || 0}\n\n## Observability Status\n- Runtime event file present: ${summary.observability?.eventsPresent ? 'yes' : 'no'}\n- Recent runtime events scanned: ${summary.observability?.recentSummary?.total || 0}\n- Blocked execution-policy events: ${summary.observability?.recentSummary?.blockedTrades || 0}\n- Open-runner first handoff events: ${summary.observability?.recentSummary?.openRunnerQueueEvents || 0}\n- Open-runner retry events: ${summary.observability?.recentSummary?.openRunnerRetryEvents || 0}\n- Degraded broker events: ${summary.observability?.recentSummary?.degradedBrokerEvents || 0}\n- Stale-data events: ${summary.observability?.recentSummary?.staleDataEvents || 0}\n\n## Allocation\n| Asset class | Current % | Target % | Drift % | Status |\n|---|---:|---:|---:|---|\n${allocationTable}\n\n## Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Latest proposal status | Approval |\n|---|---|---|---:|---|---|\n${instrumentTable}\n\n${onboardingSection}## Recent Material Events\n${eventLines}\n`;
}

async function generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles = true, readiness = null }) {
  const summary = await collectPortfolioSummary({ portfolioDir, readiness });
  const checklist = buildRecoveryChecklist(summary);
  const outPath = path.join(portfolioDir, 'summary.json');
  const htmlPath = path.join(portfolioDir, 'summary.html');
  const markdown = renderPortfolioSummaryMarkdown(summary);
  const recoveryPath = path.join(portfolioDir, 'recovery-checklist.json');
  const recoveryMarkdownPath = path.join(portfolioDir, 'recovery-checklist.md');
  const recoveryHtmlPath = path.join(portfolioDir, 'recovery-checklist.html');
  const recoveryMarkdown = renderRecoveryChecklistMarkdown(checklist);
  if (writeFiles) {
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2) + '\n');
    fs.writeFileSync(htmlPath, markdownToBasicHtml(markdown));
    fs.writeFileSync(recoveryPath, JSON.stringify(checklist, null, 2) + '\n');
    fs.writeFileSync(recoveryMarkdownPath, recoveryMarkdown);
    fs.writeFileSync(recoveryHtmlPath, markdownToBasicHtml(recoveryMarkdown));
  }
  return { summary, checklist, outPath, htmlPath, markdown, recoveryPath, recoveryMarkdownPath, recoveryHtmlPath, recoveryMarkdown };
}

function listPortfolioDirectories(repoRoot = process.cwd()) {
  const portfolioRoot = path.join(repoRoot, 'portfolio');
  if (!fs.existsSync(portfolioRoot)) return [];
  return fs.readdirSync(portfolioRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('_'))
    .map((entry) => path.join(portfolioRoot, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'portfolio.md')) && fs.existsSync(path.join(dir, 'holdings.md')) && fs.existsSync(path.join(dir, 'trades.md')) && fs.existsSync(path.join(dir, 'history.md')));
}

function buildPortfolioIndex(summaries = []) {
  const portfolios = summaries.map((summary) => ({
    portfolio: summary.portfolio,
    status: summary.status.health,
    strategyStatus: summary.status.strategy,
    totalValueChf: summary.holdings.totalValueChf,
    cashChf: summary.holdings.cashChf,
    investedChf: summary.holdings.investedChf,
    lastSyncAt: summary.holdings.lastSyncAt,
    latestSnapshotDate: summary.holdings.latestSnapshotDate,
    pendingApprovals: summary.approvals.pendingApprovalCount,
    blockers: summary.blockers.count,
    pendingActions: summary.pendingActions.length,
    recommendedNextStep: summary.recommendedNextStep,
    openRunnerQueue: Number(summary.execution?.openRunnerRetryState?.queuedInitial || 0),
    openRunnerRetry: Number(summary.execution?.openRunnerRetryState?.queuedRetry || 0),
    driftStatuses: summary.allocation.map((row) => ({ assetClass: row.assetClass, status: row.status, driftPct: row.driftPct })),
    brokerHealth: summary.status.brokerHealth,
    executionPosture: summary.status.executionPosture,
    deliveryPosture: summary.status.deliveryPosture,
    dataFreshness: summary.status.dataFreshness,
  }));

  return {
    schemaVersion: '1.1',
    generatedAt: new Date().toISOString(),
    portfolioCount: portfolios.length,
    totalValueChf: Number(portfolios.reduce((sum, item) => sum + Number(item.totalValueChf || 0), 0).toFixed(2)),
    portfolios,
    queueSummary: summarizeOperatorQueue(summaries.flatMap((summary) => summary.operatorQueue?.items || [])),
  };
}

function buildPendingActionsOverview(summaries = []) {
  const items = summaries.flatMap((summary) => (summary.operatorQueue?.items || []).map((item) => ({ ...item })));
  items.sort((a, b) => {
    const severityRank = { high: 0, medium: 1, low: 2 };
    const statusRank = { blocked: 0, degraded: 1, paused: 2, failed: 3, pending_user_approval: 4, ready_for_review: 5, in_flight: 6, pending: 7, stale: 8, warning: 9, recommended: 10 };
    return (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99)
      || (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99)
      || String(a.portfolio).localeCompare(String(b.portfolio))
      || String(a.summary).localeCompare(String(b.summary));
  });
  const enrichedItems = items.map((item, index) => ({
    ...item,
    rank: index + 1,
    queueType: item.queueType || queueTypeForItem(item),
  }));
  return {
    schemaVersion: '1.1',
    generatedAt: new Date().toISOString(),
    itemCount: enrichedItems.length,
    queueSummary: summarizeOperatorQueue(enrichedItems),
    items: enrichedItems,
  };
}

function approvalUrgencyForItem(item = {}) {
  if (item.severity === 'high' || item.blocking) return 'high';
  if (item.status === 'pending_user_approval' || item.status === 'ready_for_review') return 'medium';
  return 'low';
}

function buildApprovalsQueue(summaries = []) {
  const items = summaries.flatMap((summary) => {
    const queueItems = Array.isArray(summary.operatorQueue?.items) ? summary.operatorQueue.items : [];
    return queueItems
      .filter((item) => ['approval'].includes(item.queueType || queueTypeForItem(item)) || item.kind === 'approval')
      .map((item) => ({
        portfolio: summary.portfolio,
        urgency: approvalUrgencyForItem(item),
        status: item.status,
        summary: item.summary,
        explanation: item.summary,
        effectIfApproved: item.status === 'pending_user_approval'
          ? 'The operator can move this proposal from review into the next staging / execution decision step.'
          : 'The operator can advance the reviewed item into the next workflow step with fewer manual joins.',
        effectIfIgnored: 'The approval backlog remains open, and the related portfolio workflow stays delayed or ambiguous.',
        recommendedOperatorAction: item.recommendedOperatorAction || 'Review and resolve the approval item explicitly.',
        queueType: item.queueType || queueTypeForItem(item),
        severity: item.severity,
      }));
  });

  items.sort((a, b) => {
    const urgencyRank = { high: 0, medium: 1, low: 2 };
    return (urgencyRank[a.urgency] ?? 99) - (urgencyRank[b.urgency] ?? 99)
      || String(a.portfolio).localeCompare(String(b.portfolio))
      || String(a.summary).localeCompare(String(b.summary));
  });

  const enrichedItems = items.map((item, index) => ({ rank: index + 1, ...item }));
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    itemCount: enrichedItems.length,
    items: enrichedItems,
  };
}

function biggestDrift(summary = {}) {
  const rows = Array.isArray(summary.allocation) ? summary.allocation : [];
  if (!rows.length) return null;
  return rows
    .map((row) => ({ ...row, absDrift: Math.abs(Number(row.driftPct || 0)) }))
    .sort((a, b) => b.absDrift - a.absDrift)[0] || null;
}

function buildDailySummary(summaries = [], approvalsQueue = null) {
  const items = Array.isArray(summaries) ? summaries : [];
  const totalCash = Number(items.reduce((sum, summary) => sum + Number(summary.holdings?.cashChf || 0), 0).toFixed(2));
  const healthCounts = {
    healthy: items.filter((summary) => summary.status?.health === 'healthy').length,
    warning: items.filter((summary) => ['warning', 'attention_needed'].includes(summary.status?.health)).length,
    blocked: items.filter((summary) => summary.status?.health === 'blocked').length,
  };
  const drifts = items
    .map((summary) => {
      const drift = biggestDrift(summary);
      return drift ? {
        portfolio: summary.portfolio,
        assetClass: drift.assetClass,
        driftPct: Number(drift.driftPct || 0),
        status: drift.status,
        absDrift: Math.abs(Number(drift.driftPct || 0)),
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.absDrift - a.absDrift);
  const topDrift = drifts[0] || null;
  const approvalCount = approvalsQueue?.itemCount || 0;
  const highlightedPortfolio = items
    .slice()
    .sort((a, b) => {
      const healthRank = { blocked: 0, warning: 1, attention_needed: 1, healthy: 2 };
      return (healthRank[a.status?.health] ?? 99) - (healthRank[b.status?.health] ?? 99)
        || Number(b.approvals?.pendingApprovalCount || 0) - Number(a.approvals?.pendingApprovalCount || 0)
        || String(a.portfolio).localeCompare(String(b.portfolio));
    })[0] || null;

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    totals: {
      portfolioCount: items.length,
      totalCashChf: totalCash,
      approvalCount,
      ...healthCounts,
    },
    healthHeadline: healthCounts.blocked > 0 ? 'blocked' : (healthCounts.warning > 0 ? 'warning' : 'healthy'),
    cashWaitingToDeployChf: totalCash,
    biggestDrift: topDrift,
    brokerHealth: items.some((summary) => summary.status?.brokerHealth === 'degraded') ? 'degraded' : 'healthy',
    reportingHealth: items.some((summary) => summary.status?.dataFreshness === 'stale' || summary.status?.deliveryPosture !== 'ready') ? 'attention_needed' : 'ready',
    pendingApprovals: approvalCount,
    recommendedNextStep: highlightedPortfolio?.recommendedNextStep || 'No recommendation available.',
    biggestDriftWhy: highlightedPortfolio?.explanations?.biggestDrift || (topDrift ? `${topDrift.assetClass} is the largest current drift signal in the portfolio set.` : 'No drift explanation available.'),
    highlightedPortfolio: highlightedPortfolio ? {
      portfolio: highlightedPortfolio.portfolio,
      health: highlightedPortfolio.status?.health,
      cashChf: highlightedPortfolio.holdings?.cashChf || 0,
      brokerHealth: highlightedPortfolio.status?.brokerHealth,
      deliveryPosture: highlightedPortfolio.status?.deliveryPosture,
      pendingApprovals: highlightedPortfolio.approvals?.pendingApprovalCount || 0,
      recommendedNextStep: highlightedPortfolio.recommendedNextStep,
      whyNow: highlightedPortfolio.explanations?.executionBlock || highlightedPortfolio.explanations?.approvalBacklog || 'No highlighted explanation available.',
    } : null,
  };
}

function renderDailySummaryMarkdown(daily = {}) {
  const drift = daily.biggestDrift;
  const highlight = daily.highlightedPortfolio;
  return `# Daily Summary Page\n\n## Headline\n- Overall health: ${daily.healthHeadline || 'unknown'}\n- Portfolios tracked: ${daily.totals?.portfolioCount || 0}\n- Cash waiting to deploy CHF: ${daily.cashWaitingToDeployChf || 0}\n- Pending approvals: ${daily.pendingApprovals || 0}\n- Broker health: ${daily.brokerHealth || 'unknown'}\n- Reporting health: ${daily.reportingHealth || 'unknown'}\n- Recommended next step: ${daily.recommendedNextStep || 'No recommendation available.'}\n\n## Biggest Drift Today\n- ${drift ? `${drift.portfolio}: ${drift.assetClass} drift ${drift.driftPct}% (${drift.status})` : 'No drift data available.'}\n- Why it matters: ${daily.biggestDriftWhy || 'No drift explanation available.'}\n\n## Highlighted Portfolio\n- Portfolio: ${highlight?.portfolio || 'none'}\n- Health: ${highlight?.health || 'unknown'}\n- Cash CHF: ${highlight?.cashChf || 0}\n- Broker health: ${highlight?.brokerHealth || 'unknown'}\n- Delivery posture: ${highlight?.deliveryPosture || 'unknown'}\n- Pending approvals: ${highlight?.pendingApprovals || 0}\n- Recommended next step: ${highlight?.recommendedNextStep || 'No recommendation available.'}\n- Why now: ${highlight?.whyNow || 'No highlighted explanation available.'}\n`;
}

function renderApprovalsQueueMarkdown(queue = {}) {
  const rows = Array.isArray(queue.items) && queue.items.length
    ? queue.items.map((item) => `### Approval ${item.rank}: ${item.portfolio}\n- Urgency: ${item.urgency}\n- Summary: ${item.summary}\n- Explanation: ${item.explanation}\n- Effect if approved: ${item.effectIfApproved}\n- Effect if ignored: ${item.effectIfIgnored}\n- Recommended action: ${item.recommendedOperatorAction}`).join('\n\n')
    : '### Approval 1: none\n- Urgency: low\n- Summary: No pending approval items.\n- Explanation: No approval-gated actions are currently waiting.\n- Effect if approved: No action required.\n- Effect if ignored: No approval backlog remains.\n- Recommended action: Continue normal monitoring.';
  return `# Approvals Queue\n\n## Summary\n- Generated at: ${queue.generatedAt || 'unknown'}\n- Approval items: ${queue.itemCount || 0}\n\n## Approval Review Queue\n\n${rows}\n`;
}

function collectReportFiles(reportsDir) {
  const entries = [];
  if (!fs.existsSync(reportsDir)) return entries;
  const periods = fs.readdirSync(reportsDir).filter((name) => {
    const full = path.join(reportsDir, name);
    return fs.statSync(full).isDirectory() && !name.startsWith('.');
  });
  for (const period of periods) {
    const periodDir = path.join(reportsDir, period);
    const files = fs.readdirSync(periodDir).filter((f) => /\.(md|html|pdf)$/i.test(f));
    const groups = new Map();
    for (const file of files) {
      const dateMatch = file.match(/(\d{8})/);
      const date = dateMatch ? dateMatch[1] : 'unknown';
      const ext = path.extname(file).replace('.', '');
      const key = file.replace(/\.(md|html|pdf)$/i, '');
      if (!groups.has(key)) groups.set(key, { basename: key, period, date, formats: [], paths: [] });
      const group = groups.get(key);
      group.formats.push(ext);
      group.paths.push(path.join(period, file));
    }
    for (const group of groups.values()) {
      group.formats.sort();
      group.paths.sort();
      entries.push(group);
    }
  }
  entries.sort((a, b) => b.date.localeCompare(a.date) || a.period.localeCompare(b.period));
  return entries;
}

function buildReportHistory(repoRoot, summaries = []) {
  const portfolios = [];
  const portfolioDirs = listPortfolioDirectories(repoRoot);
  for (const portfolioDir of portfolioDirs) {
    const portfolioName = path.basename(portfolioDir);
    const reportsDir = path.join(portfolioDir, 'reports');
    const reports = collectReportFiles(reportsDir);
    portfolios.push({ portfolio: portfolioName, reportCount: reports.length, reports });
  }
  const totalReports = portfolios.reduce((sum, p) => sum + p.reportCount, 0);
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    totalReports,
    portfolioCount: portfolios.length,
    portfolios,
  };
}

function renderReportHistoryMarkdown(history = {}) {
  const portfolioSections = (history.portfolios || []).map((p) => {
    if (!p.reports.length) return `### ${p.portfolio}\n\nNo reports generated yet.`;
    const rows = p.reports.map((r) => `| ${r.date} | ${r.period} | ${r.formats.join(', ')} | ${r.basename} |`).join('\n');
    return `### ${p.portfolio}\n\n| Date | Period | Formats | Report |\n|---|---|---|---|\n${rows}`;
  }).join('\n\n');
  return `# Report History\n\n- Generated at: ${history.generatedAt || 'unknown'}\n- Total reports: ${history.totalReports || 0}\n- Portfolios: ${history.portfolioCount || 0}\n\n## Report Index\n\n${portfolioSections}\n`;
}

function buildDeliveryOverview(repoRoot) {
  const { reportDeliveryStatus } = require('./deliveryPolicy');
  const portfolioDirs = listPortfolioDirectories(repoRoot);
  const portfolios = [];
  for (const portfolioDir of portfolioDirs) {
    const status = reportDeliveryStatus({ portfolioDir });
    portfolios.push({
      portfolio: status.portfolio,
      deliveryMode: status.deliveryMode,
      intendedChannels: status.intendedChannels,
      externalDeliveryEnabled: status.externalDeliveryEnabled,
      failureAlertMode: status.failureAlertMode,
      failureAlertTargets: status.failureAlertTargets,
      overrideLoaded: status.overrideLoaded,
      ready: status.ready,
      pendingActions: status.pendingActions,
    });
  }
  const allReady = portfolios.every((p) => p.ready);
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    portfolioCount: portfolios.length,
    allReady,
    portfolios,
  };
}

function renderDeliveryStatusMarkdown(overview = {}) {
  const portfolioSections = (overview.portfolios || []).map((p) => {
    const actions = p.pendingActions.length
      ? p.pendingActions.map((a) => `  - ${a}`).join('\n')
      : '  - None';
    return `### ${p.portfolio}\n- Delivery mode: ${p.deliveryMode}\n- Channels: ${(p.intendedChannels || []).join(', ')}\n- External delivery: ${p.externalDeliveryEnabled ? 'enabled' : 'disabled'}\n- Failure alert mode: ${p.failureAlertMode}\n- Alert targets: ${(p.failureAlertTargets || []).join(', ')}\n- Policy override loaded: ${p.overrideLoaded ? 'yes' : 'no'}\n- Ready: ${p.ready ? 'yes' : 'no'}\n- Pending actions:\n${actions}`;
  }).join('\n\n');
  return `# Delivery & Alerting Status\n\n- Generated at: ${overview.generatedAt || 'unknown'}\n- Portfolios: ${overview.portfolioCount || 0}\n- All ready: ${overview.allReady ? 'yes' : 'no'}\n\n## Per-Portfolio Delivery Posture\n\n${portfolioSections}\n`;
}

function renderCockpitPage({ dailySummary = {}, approvalsQueue = {}, reportHistory = {}, summaries = [], deliveryOverview = {} }) {
  const health = dailySummary.healthHeadline || 'unknown';
  const badgeClass = health === 'healthy' ? 'badge-healthy' : health === 'blocked' ? 'badge-blocked' : 'badge-warning';
  const drift = dailySummary.biggestDrift;
  const portfolioCards = summaries.map((s) => {
    const h = s.status?.health || 'unknown';
    const bc = h === 'healthy' ? 'badge-healthy' : h === 'blocked' ? 'badge-blocked' : 'badge-warning';
    return `<li><a href="../../portfolio/${s.portfolio}/summary.html">${s.portfolio}</a> <span class="badge ${bc}">${h}</span></li>`;
  }).join('\n');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Operator Cockpit</title>
<style>
:root {
  --color-healthy: #16a34a;
  --color-warning: #d97706;
  --color-blocked: #dc2626;
  --color-info: #2563eb;
  --color-muted: #6b7280;
  --color-bg: #fafafa;
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
  --color-text: #1f2937;
  --color-text-secondary: #4b5563;
}
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 32px 40px; color: var(--color-text); background: var(--color-bg); line-height: 1.6; }
.cockpit { max-width: 900px; margin: 0 auto; background: var(--color-surface); border-radius: 8px; padding: 32px 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 8px 0; padding-bottom: 12px; border-bottom: 2px solid var(--color-border); }
h2 { font-size: 1.15rem; font-weight: 600; margin: 28px 0 12px 0; }
a { color: var(--color-info); text-decoration: none; }
a:hover { text-decoration: underline; }
.badge { display: inline-block; font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
.badge-healthy { background: #dcfce7; color: var(--color-healthy); }
.badge-warning { background: #fef3c7; color: var(--color-warning); }
.badge-blocked { background: #fee2e2; color: var(--color-blocked); }
.badge-info { background: #dbeafe; color: var(--color-info); }
.status-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
.status-card { background: #f9fafb; border: 1px solid var(--color-border); border-radius: 6px; padding: 12px 16px; }
.status-card .label { font-size: 0.75rem; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.status-card .value { font-size: 1.1rem; font-weight: 600; margin-top: 4px; }
ul { list-style: none; padding: 0; }
li { margin: 6px 0; }
.meta { font-size: 0.8rem; color: var(--color-muted); margin-top: 24px; }
nav a { display: inline-block; margin-right: 16px; margin-bottom: 8px; padding: 6px 12px; background: #f3f4f6; border-radius: 4px; font-size: 0.85rem; }
nav a:hover { background: #dbeafe; }
</style>
</head>
<body>
<div class="cockpit">
<h1>Operator Cockpit</h1>
<div class="status-grid">
  <div class="status-card"><div class="label">Overall Health</div><div class="value"><span class="badge ${badgeClass}">${health}</span></div></div>
  <div class="status-card"><div class="label">Pending Approvals</div><div class="value">${approvalsQueue.itemCount || 0}</div></div>
  <div class="status-card"><div class="label">Cash to Deploy (CHF)</div><div class="value">${dailySummary.cashWaitingToDeployChf || 0}</div></div>
  <div class="status-card"><div class="label">Biggest Drift</div><div class="value">${drift ? `${drift.assetClass} ${drift.driftPct}%` : 'none'}</div></div>
  <div class="status-card"><div class="label">Broker Health</div><div class="value">${dailySummary.brokerHealth || 'unknown'}</div></div>
  <div class="status-card"><div class="label">Reports Available</div><div class="value">${reportHistory.totalReports || 0}</div></div>
</div>

<h2>Navigation</h2>
<nav>
  <a href="daily-summary.html">Daily Summary</a>
  <a href="approvals-queue.html">Approvals Queue</a>
  <a href="report-history.html">Report History</a>
  <a href="delivery-status.html">Delivery &amp; Alerting</a>
  <a href="portfolio-overview.html">Multi-Portfolio Overview</a>
</nav>

<h2>Portfolios</h2>
<ul>
${portfolioCards}
</ul>

<p class="meta">Generated: ${new Date().toISOString()}</p>
</div>
</body>
</html>`;
}

async function generateOverviewArtifacts({ repoRoot = process.cwd(), writeFiles = true, readiness = null } = {}) {
  const portfolioDirs = listPortfolioDirectories(repoRoot);
  const summaries = [];
  for (const portfolioDir of portfolioDirs) {
    const portfolioReadiness = readiness && path.basename(portfolioDir) === 'etf' ? readiness : null;
    const { summary } = await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles, readiness: portfolioReadiness });
    summaries.push(summary);
  }
  const portfolioIndex = buildPortfolioIndex(summaries);
  const pendingActions = buildPendingActionsOverview(summaries);
  const approvalsQueue = buildApprovalsQueue(summaries);
  const approvalsQueueMarkdown = renderApprovalsQueueMarkdown(approvalsQueue);
  const dailySummary = buildDailySummary(summaries, approvalsQueue);
  const dailySummaryMarkdown = renderDailySummaryMarkdown(dailySummary);
  const overviewDir = path.join(repoRoot, 'runtime', 'overview');
  const portfolioIndexPath = path.join(overviewDir, 'portfolio-index.json');
  const pendingActionsPath = path.join(overviewDir, 'pending-actions.json');
  const approvalsQueuePath = path.join(overviewDir, 'approvals-queue.json');
  const approvalsQueueMarkdownPath = path.join(overviewDir, 'approvals-queue.md');
  const approvalsQueueHtmlPath = path.join(overviewDir, 'approvals-queue.html');
  const dailySummaryPath = path.join(overviewDir, 'daily-summary.json');
  const dailySummaryMarkdownPath = path.join(overviewDir, 'daily-summary.md');
  const dailySummaryHtmlPath = path.join(overviewDir, 'daily-summary.html');
  if (writeFiles) {
    fs.mkdirSync(overviewDir, { recursive: true });
    fs.writeFileSync(portfolioIndexPath, JSON.stringify(portfolioIndex, null, 2) + '\n');
    fs.writeFileSync(pendingActionsPath, JSON.stringify(pendingActions, null, 2) + '\n');
    fs.writeFileSync(approvalsQueuePath, JSON.stringify(approvalsQueue, null, 2) + '\n');
    fs.writeFileSync(approvalsQueueMarkdownPath, approvalsQueueMarkdown);
    fs.writeFileSync(approvalsQueueHtmlPath, markdownToBasicHtml(approvalsQueueMarkdown));
    fs.writeFileSync(dailySummaryPath, JSON.stringify(dailySummary, null, 2) + '\n');
    fs.writeFileSync(dailySummaryMarkdownPath, dailySummaryMarkdown);
    fs.writeFileSync(dailySummaryHtmlPath, markdownToBasicHtml(dailySummaryMarkdown));
  }
  const reportHistory = buildReportHistory(repoRoot, summaries);
  const reportHistoryMarkdown = renderReportHistoryMarkdown(reportHistory);
  const reportHistoryPath = path.join(overviewDir, 'report-history.json');
  const reportHistoryMarkdownPath = path.join(overviewDir, 'report-history.md');
  const reportHistoryHtmlPath = path.join(overviewDir, 'report-history.html');
  const deliveryOverview = buildDeliveryOverview(repoRoot);
  const deliveryStatusMarkdown = renderDeliveryStatusMarkdown(deliveryOverview);
  const deliveryStatusPath = path.join(overviewDir, 'delivery-status.json');
  const deliveryStatusMarkdownPath = path.join(overviewDir, 'delivery-status.md');
  const deliveryStatusHtmlPath = path.join(overviewDir, 'delivery-status.html');
  if (writeFiles) {
    fs.writeFileSync(reportHistoryPath, JSON.stringify(reportHistory, null, 2) + '\n');
    fs.writeFileSync(reportHistoryMarkdownPath, reportHistoryMarkdown);
    fs.writeFileSync(reportHistoryHtmlPath, markdownToBasicHtml(reportHistoryMarkdown));
    fs.writeFileSync(deliveryStatusPath, JSON.stringify(deliveryOverview, null, 2) + '\n');
    fs.writeFileSync(deliveryStatusMarkdownPath, deliveryStatusMarkdown);
    fs.writeFileSync(deliveryStatusHtmlPath, markdownToBasicHtml(deliveryStatusMarkdown));
  }
  const cockpitHtmlPath = path.join(overviewDir, 'index.html');
  if (writeFiles) {
    const cockpitHtml = renderCockpitPage({ dailySummary, approvalsQueue, reportHistory, summaries, deliveryOverview });
    fs.writeFileSync(cockpitHtmlPath, cockpitHtml);
  }
  return {
    summaries,
    portfolioIndex,
    pendingActions,
    approvalsQueue,
    approvalsQueueMarkdown,
    dailySummary,
    dailySummaryMarkdown,
    reportHistory,
    reportHistoryMarkdown,
    deliveryOverview,
    deliveryStatusMarkdown,
    portfolioIndexPath,
    pendingActionsPath,
    approvalsQueuePath,
    approvalsQueueMarkdownPath,
    approvalsQueueHtmlPath,
    dailySummaryPath,
    dailySummaryMarkdownPath,
    dailySummaryHtmlPath,
    reportHistoryPath,
    reportHistoryMarkdownPath,
    reportHistoryHtmlPath,
    deliveryStatusPath,
    deliveryStatusMarkdownPath,
    deliveryStatusHtmlPath,
    cockpitHtmlPath,
  };
}

module.exports = {
  parseHoldingsSummary,
  countHoldingRows,
  strategyStatus,
  healthLabel,
  buildPendingActionItems,
  buildPortfolioSummaryModel,
  queueTypeForItem,
  summarizeOperatorQueue,
  collectPortfolioSummary,
  buildRecoveryChecklist,
  renderRecoveryChecklistMarkdown,
  renderPortfolioSummaryMarkdown,
  generatePortfolioSummaryArtifacts,
  listPortfolioDirectories,
  buildPortfolioIndex,
  buildPendingActionsOverview,
  approvalUrgencyForItem,
  biggestDrift,
  buildApprovalsQueue,
  buildDailySummary,
  renderApprovalsQueueMarkdown,
  renderDailySummaryMarkdown,
  buildReportHistory,
  renderReportHistoryMarkdown,
  buildDeliveryOverview,
  renderDeliveryStatusMarkdown,
  renderCockpitPage,
  generateOverviewArtifacts,
};
