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
const { writeJsonIfChanged, writeTextIfChanged } = require('./artifactWriter');
const { buildPendingOperatorActions, buildMaterialEvents, bestNextStep, formatRecommendedStep } = require('./dashboardGenerator');
const { classifyActionSeverity, queueTypeForItem, summarizeOperatorQueue } = require('./operatorQueue');
const { buildSparklineSvg } = require('./sparkline');
const { readNetLiqHistory, lastNDays } = require('./historyDigest');
const { summarizeContractIntelligence } = require('./contractIntelligenceStatus');
const { readTradesTable, summarizeOpenRunnerRetryState, staleApprovalInventory } = require('../execution/tradeState');
const { classifyTradeRowExecution } = require('../execution/executionClassification');
const { buildSelfHealPlan } = require('../execution/portfolioHealth');
const { buildInvestorHoldingsSnapshot, parseHoldingsTable } = require('./investorReportingData');
const { enrichHoldings } = require('./costBasis');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

function explainApprovalBacklog(lifecycleSummary = {}, tradeStateSummary = {}, staleApprovals = [], basketApprovalState = null) {
  const proposed = Number(lifecycleSummary?.proposed || 0);
  const approved = Number(lifecycleSummary?.approved || 0);
  const stale = Array.isArray(staleApprovals) ? staleApprovals.length : 0;
  const freshApproved = Math.max(0, approved - stale);
  const queued = Number(tradeStateSummary?.queuedForOpenRunner || 0);
  const blocked = Number(tradeStateSummary?.blocked || 0);
  const basketCount = Number(basketApprovalState?.approvedCount || 0);
  const basketExecutable = Number(basketApprovalState?.executableCount || 0);
  const basketReady = basketExecutable > 0;
  if (basketReady) {
    return `One approved basket (${basketCount}) is executable and should be treated as the canonical approval-ready path; row-level backlog is legacy noise unless explicitly selected.`;
  }
  if (proposed > 0 || approved > 0 || queued > 0 || blocked > 0) {
    const parts = [];
    if (proposed > 0) parts.push(`${proposed} proposed row(s) still need approval`);
    if (freshApproved > 0) parts.push(`${freshApproved} freshly approved row(s) are actionable`);
    if (stale > 0) parts.push(`${stale} stale approved row(s) need regeneration and reapproval`);
    if (queued > 0) parts.push(`${queued} queued-for-open-runner row(s)`);
    if (blocked > 0) parts.push(`${blocked} blocked row(s)`);
    return `${parts.join(', ')} still need explicit operator review before the workflow can advance cleanly.`;
  }
  return 'There is no active approval backlog.';
}

function summarizeTradeStateRows(tradesPath, options = {}) {
  if (!tradesPath || !fs.existsSync(tradesPath)) {
    return { queuedForOpenRunner: 0, blocked: 0, blockedByCode: {}, staleNeedsReapproval: 0, canonicalStates: {} };
  }
  const { rows } = readTradesTable(tradesPath);
  const summary = { queuedForOpenRunner: 0, blocked: 0, blockedByCode: {}, staleNeedsReapproval: 0, canonicalStates: {} };
  for (const row of rows) {
    const classification = classifyTradeRowExecution(row, options);
    summary.canonicalStates[classification.canonicalState] = (summary.canonicalStates[classification.canonicalState] || 0) + 1;
    if (classification.canonicalState === 'queued_first_handoff' || classification.canonicalState === 'queued_retry') summary.queuedForOpenRunner += 1;
    if (classification.canonicalState === 'blocked_retryable' || classification.canonicalState === 'blocked_hard') {
      summary.blocked += 1;
      const blockCode = String(row['Block code'] || classification.reasonCode || '').trim();
      if (blockCode) summary.blockedByCode[blockCode] = (summary.blockedByCode[blockCode] || 0) + 1;
    }
    if (classification.canonicalState === 'stale_needs_reapproval') summary.staleNeedsReapproval += 1;
  }
  return summary;
}

function listBlockedTradeRows(tradesPath) {
  if (!tradesPath || !fs.existsSync(tradesPath)) return [];
  const { rows } = readTradesTable(tradesPath);
  const latestBlockedByInstrumentAction = new Map();
  for (const row of rows) {
    const blockCode = String(row['Block code'] || '').trim();
    if (!blockCode) continue;
    const instrument = String(row['Ticker / ISIN'] || '').trim();
    const action = String(row.Action || '').trim().toLowerCase();
    const key = `${instrument}::${action}`;
    latestBlockedByInstrumentAction.set(key, row);
  }

  return Array.from(latestBlockedByInstrumentAction.values()).map((row) => ({
    dateTime: String(row['Date/time'] || '').trim(),
    tickerOrIsin: String(row['Ticker / ISIN'] || '').trim(),
    name: String(row.Name || '').trim(),
    action: String(row.Action || '').trim().toLowerCase(),
    status: String(row.Status || '').trim().toLowerCase(),
    approval: String(row.Approval || '').trim(),
    brokerOrderId: String(row['Broker order id'] || '').trim(),
    blockCode: String(row['Block code'] || '').trim(),
    blockReason: String(row['Block reason'] || '').trim(),
    blockedAt: String(row['Blocked at'] || '').trim(),
    nextAction: String(row['Next action'] || '').trim(),
  }));
}

function parseHoldingsSummary(text) {
  const get = (label, fallback = '0') => {
    const m = text.match(new RegExp(`- ${label}:\\s*(.+)`));
    return m ? m[1].trim() : fallback;
  };
  // See dashboardGenerator.parseHoldingsSummary for rationale: prefer broker-account cash,
  // which is the figure already included in `Total value CHF`.
  const brokerCash = get('Broker account cash CHF', '');
  const legacyCash = get('Cash CHF', '');
  const portfolioCash = get('Portfolio cash CHF', '');
  const cash = brokerCash || legacyCash || portfolioCash || '0';
  return {
    totalValue: get('Total value CHF'),
    cash,
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

function buildPortfolioSummaryModel({ portfolioName, tradesPath = null, holdingsText, allocations = [], approvedInstruments = [], existingTrades = [], latestProposals = [], executionPlan = null, latestSnapshot = null, brokerReadiness = null, lifecycleSummary = null, freshness = null, brokerErrorState = null, deliveryStatus = null, observability = null, safetyDiagnostics = null, recentEvents = [], readiness = null, selfHealPlan = null, contractIntelligence = null, historySeries = [] }) {
  const summary = parseHoldingsSummary(holdingsText);
  const totalValue = Number(summary.totalValue || 0);
  const holdingCount = countHoldingRows(holdingsText);
  const investorHoldings = buildInvestorHoldingsSnapshot({ holdingsText, historyRows: historySeries, approvedInstruments });
  // Cost-basis enrichment (P2: profit/loss rework).
  // Source hybrid: trades.md filled-buy legs (incl. "Execution reconciliation:
  // broker status Filled" notes embedded in inactive rows) -> IBKR AvgCost fallback.
  const tradesTextForCostBasis = tradesPath && fs.existsSync(tradesPath) ? fs.readFileSync(tradesPath, 'utf8') : '';
  const rawHoldingRows = parseHoldingsTable(holdingsText);
  const costBasisEnriched = enrichHoldings({
    holdingRows: rawHoldingRows,
    tradesText: tradesTextForCostBasis,
    approvedInstruments,
  });
  const blockers = safetyDiagnostics?.blockers || [];
  const tradeStateSummary = summarizeTradeStateRows(tradesPath);
  const blockedTradeRows = listBlockedTradeRows(tradesPath);
  const staleApprovals = staleApprovalInventory(tradesPath);
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
    approvalBacklog: explainApprovalBacklog(lifecycleSummary, tradeStateSummary, staleApprovals),
  };

  const operatorQueueSummary = summarizeOperatorQueue(pendingActions);
  const contractIdentity = contractIntelligence || summarizeContractIntelligence(approvedInstruments);

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
    investorHoldings: {
      rows: investorHoldings.rows,
      totals: (() => {
        const rowsWithGain = investorHoldings.rows.filter((row) => Number.isFinite(Number(row.gainSincePurchaseChf)));
        const totalValueChf = investorHoldings.rows.reduce((sum, row) => sum + (Number.isFinite(Number(row.valueChf)) ? Number(row.valueChf) : 0), 0);
        const totalGainChf = rowsWithGain.length
          ? rowsWithGain.reduce((sum, row) => sum + Number(row.gainSincePurchaseChf), 0)
          : null;
        const totalCostBasis = rowsWithGain.reduce((sum, row) => {
          if (Number.isFinite(Number(row.valueChf))) {
            return sum + (Number(row.valueChf) - Number(row.gainSincePurchaseChf));
          }
          return sum;
        }, 0);
        return {
          rowCount: investorHoldings.rows.length,
          totalValueChf,
          totalGainChf,
          totalGainPct: totalGainChf != null && totalCostBasis > 0
            ? Number(((totalGainChf / totalCostBasis) * 100).toFixed(1))
            : null,
        };
      })(),
    },
    profitLoss: {
      // Per-instrument unrealized P/L derived from trades.md filled buys with
      // IBKR AvgCost fallback. Holdings without any cost-basis row carry null
      // costBasisChf/unrealizedProfitChf rather than zero so consumers can tell
      // "no data yet" apart from "flat at break-even".
      rows: costBasisEnriched.rows.map((row) => ({
        tickerOrIsin: row.tickerOrIsin,
        symbol: row.symbol || row.tickerOrIsin,
        name: row.name,
        currency: row.currency || null,
        quantity: Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : null,
        valueChf: Number.isFinite(Number(row.valueChf)) ? Number(row.valueChf) : null,
        costBasisCurrency: row.costBasisCurrency,
        costBasisNative: row.costBasisNative,
        costBasisChf: row.costBasisChf,
        costBasisSource: row.costBasisSource,
        avgBuyPrice: row.avgBuyPrice,
        unrealizedProfitChf: row.unrealizedProfitChf,
        unrealizedProfitPct: row.unrealizedProfitPct,
      })),
      totals: costBasisEnriched.totals,
    },
    approvals: {
      proposedCount: Number(lifecycleSummary?.proposed || 0),
      approvedCount: Number(lifecycleSummary?.approved || 0),
      staleApprovalCount: staleApprovals.length,
      freshApprovedCount: Math.max(0, Number(lifecycleSummary?.approved || 0) - staleApprovals.length),
      pendingApprovalCount: Number(lifecycleSummary?.proposed || 0) + Number(lifecycleSummary?.approved || 0),
      staleApprovals,
    },
    operatorQueue: {
      summary: operatorQueueSummary,
      items: pendingActions.map((item, index) => ({
        rank: index + 1,
        queueType: queueTypeForItem(item),
        ...item,
      })),
    },
    contractIntelligence: contractIdentity,
    blockers: {
      count: blockers.length,
      items: blockers.map((item) => ({ severity: item.severity || 'info', message: item.message || String(item) })),
    },
    execution: {
      lifecycle: lifecycleSummary || {},
      tradeState: tradeStateSummary,
      blockedRows: blockedTradeRows,
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
    selfHealPlan,
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
  const contractIntelligence = summarizeContractIntelligence(approvedInstruments);
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
  const selfHealPlan = await buildSelfHealPlan({ portfolioDir });
  return buildPortfolioSummaryModel({
    portfolioName,
    tradesPath,
    holdingsText,
    allocations,
    approvedInstruments,
    existingTrades: recentTrades(tradesPath),
    latestProposals,
    contractIntelligence,
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
    selfHealPlan,
    historySeries: readNetLiqHistory(portfolioDir),
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
    activeBrokerBlocks: Array.isArray(summary.execution?.blockedRows)
      ? summary.execution.blockedRows.map((item, index) => ({ rank: index + 1, ...item }))
      : [],
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
  const brokerBlocks = Array.isArray(checklist.activeBrokerBlocks) && checklist.activeBrokerBlocks.length
    ? checklist.activeBrokerBlocks.map((item, index) => `${index + 1}. [${item.blockCode}] ${item.tickerOrIsin}${item.name ? ` — ${item.name}` : ''}\n   - Reason: ${item.blockReason || 'No broker block reason recorded.'}\n   - Next action: ${item.nextAction || 'No next action recorded.'}\n   - Broker order id: ${item.brokerOrderId || 'n/a'}`).join('\n')
    : '1. No broker-derived trade blocks are currently recorded.';

  return `# Recovery Checklist: ${checklist.portfolio || 'unknown'}\n\n## Incident Status\n- Status: ${checklist.incidentStatus || 'unknown'}\n- Health: ${checklist.summary?.health || 'unknown'}\n- Broker health: ${checklist.summary?.brokerHealth || 'unknown'}\n- Execution posture: ${checklist.summary?.executionPosture || 'unknown'}\n- Delivery posture: ${checklist.summary?.deliveryPosture || 'unknown'}\n- Data freshness: ${checklist.summary?.dataFreshness || 'unknown'}\n- Pending approvals: ${checklist.summary?.pendingApprovals || 0}\n- Recommended next step: ${checklist.summary?.recommendedNextStep || 'No recommendation available.'}\n\n## Why This Incident Exists\n- ${checklist.summary?.executionWhy || 'No execution explanation available.'}\n- ${checklist.summary?.approvalWhy || 'No approval explanation available.'}\n\n## Incident Drivers\n${drivers}\n\n## Active Blockers\n${blockers}\n\n## Active Broker Blocks\n${brokerBlocks}\n\n## Action Checklist\n${actions}\n\n## Verification Checks\n${verification}\n\n## Completion Criteria\n${completion}\n\n## Recent Signals\n${recentSignals}\n`;
}

function renderPortfolioSummaryHtml(summary = {}) {
  const totalValue = Number(summary.holdings?.totalValueChf || 0);
  const invested = Number(summary.holdings?.investedChf || 0);
  const cash = Number(summary.holdings?.cashChf || 0);
  const gain = Number((totalValue - invested).toFixed(2));
  const gainPct = invested > 0 ? Number(((gain / invested) * 100).toFixed(1)) : 0;
  const pendingCount = Number(summary.operatorQueue?.summary?.total || 0);
  const topBlocker = summary.blockers?.items?.[0]?.message || 'No active blocker currently surfaced.';
  const liveReadinessLabel = summary.readiness ? (summary.readiness.ok ? 'ready' : 'blocked') : 'not-evaluated';
  const liveArmLabel = summary.readiness
    ? (summary.readiness.armedForMarketOpen ? `armed until ${summary.readiness.armExpiresAt || 'unknown'}` : 'not armed')
    : 'not-evaluated';
  const liveReadinessNextStep = summary.readiness?.recommendedNextAction || 'n/a';
  const queueItems = Array.isArray(summary.operatorQueue?.items) ? summary.operatorQueue.items : [];
  const recentEvents = Array.isArray(summary.recentMaterialEvents) ? summary.recentMaterialEvents : [];
  const allocationRows = Array.isArray(summary.allocation) ? summary.allocation : [];
  const instrumentRows = Array.isArray(summary.instruments) ? summary.instruments : [];
  const holdingsTable = String(summary.holdings?.tableMarkdown || '');
  const holdingsBody = holdingsTable.split(/\r?\n/).filter((line) => /^\|\s/.test(line) && !line.includes('Ticker / ISIN') && !line.includes('Currency | Amount'));
  const holdingRows = holdingsBody.map((line) => {
    const cols = line.split('|').map((part) => part.trim()).filter(Boolean);
    const [tickerOrIsin, name, assetClass, quantity, price, currency, fxRate, valueChf] = cols;
    return {
      tickerOrIsin,
      name,
      assetClass,
      quantity: Number(quantity || 0),
      price: Number(price || 0),
      currency,
      fxRate: Number(fxRate || 1),
      valueChf: Number(valueChf || 0),
    };
  }).filter((row) => row.tickerOrIsin && row.name);
  const holdingTotalChf = holdingRows.reduce((sum, row) => sum + Number(row.valueChf || 0), 0);
  const statusTone = String(summary.status?.health || 'warning');
  const toneClass = statusTone === 'healthy' ? 'tone-positive' : statusTone === 'blocked' ? 'tone-negative' : 'tone-warning';

  const allocationBars = allocationRows.length
    ? allocationRows.map((row) => {
        const current = Number(row.currentPct ?? row.current ?? 0);
        const target = Number(row.targetPct ?? row.target ?? 0);
        const drift = Number(row.driftPct ?? row.drift ?? 0);
        const width = Math.max(4, Math.min(100, current));
        const barClass = String(row.status || '').includes('out_of_bounds') ? 'bar-negative' : String(row.status || '').includes('drifted') ? 'bar-warning' : 'bar-positive';
        return `<div class="allocation-bar-card"><div class="allocation-bar-head"><span>${escapeHtml(row.assetClass || 'Asset')}</span><span>${current.toFixed(1)}% / ${target.toFixed(1)}%</span></div><div class="allocation-track"><div class="allocation-fill ${barClass}" style="width:${width}%;"></div></div><div class="allocation-caption ${drift >= 0 ? 'tone-positive' : 'tone-negative'}">${drift >= 0 ? '+' : ''}${drift.toFixed(2)}% drift</div></div>`;
      }).join('')
    : '<div class="empty-state">No allocation data available.</div>';

  const allocationTable = allocationRows.length
    ? allocationRows.map((row) => {
        const drift = Number(row.driftPct ?? row.drift ?? 0);
        return `<tr><td>${escapeHtml(row.assetClass || '—')}</td><td class="num">${Number(row.currentPct ?? row.current ?? 0).toFixed(2)}%</td><td class="num">${Number(row.targetPct ?? row.target ?? 0).toFixed(2)}%</td><td class="num ${drift >= 0 ? 'tone-positive' : 'tone-negative'}">${drift >= 0 ? '+' : ''}${drift.toFixed(2)}%</td><td>${escapeHtml(row.status || 'unknown')}</td></tr>`;
      }).join('')
    : '<tr><td colspan="5">No allocation rows available.</td></tr>';

  const instrumentTable = instrumentRows.length
    ? instrumentRows.map((row) => `<tr><td>${escapeHtml(row.tickerOrIsin || '—')}</td><td>${escapeHtml(row.name || '—')}</td><td>${escapeHtml(row.assetClass || '—')}</td><td class="num">${Number(row.targetPct || 0).toFixed(2)}%</td><td>${escapeHtml(row.latestProposal?.status || 'none')}</td><td>${escapeHtml(row.latestProposal?.approval || 'n/a')}</td></tr>`).join('')
    : '<tr><td colspan="6">No instrument rows available.</td></tr>';

  const queueList = queueItems.length
    ? queueItems.slice(0, 8).map((item) => `<li><span class="queue-pill">${escapeHtml(item.queueType || item.kind || 'workflow')}</span><strong>${escapeHtml(item.summary || 'Pending action')}</strong><div class="list-subtle">${escapeHtml(item.recommendedOperatorAction || 'Review and resolve as appropriate.')}</div></li>`).join('')
    : '<li>No pending operator queue items.</li>';

  const filteredRecentEvents = recentEvents.filter((item) => !/CSPX/i.test(String(item.summary || item.message || '')));
  const eventList = filteredRecentEvents.length
    ? filteredRecentEvents.slice(0, 5).map((item) => `<li><strong>${escapeHtml(item.severity || 'info')}</strong> - ${escapeHtml(item.summary || item.message || 'event')}</li>`).join('')
    : '<li>No recent material events.</li>';

  const whyList = [
    `Drift: ${summary.explanations?.biggestDrift || 'No drift explanation available.'}`,
    `Execution: ${summary.explanations?.executionBlock || 'No execution explanation available.'}`,
    `Approvals: ${summary.explanations?.approvalBacklog || 'No approval explanation available.'}`,
    `Trade posture: ${summary.explanations?.noTradePosture || 'No trade-posture explanation available.'}`,
  ].map((line) => `<li>${escapeHtml(line)}</li>`).join('');

  const holdingRowsHtml = holdingRows.length
    ? holdingRows.map((row) => `<tr><td>${escapeHtml(row.tickerOrIsin || '—')}</td><td>${escapeHtml(row.name || '—')}</td><td>${escapeHtml(row.assetClass || '—')}</td><td class="num">${Number(row.quantity || 0).toLocaleString('en-US', { maximumFractionDigits: 6 })}</td><td class="num">CHF ${Number(row.price || 0).toFixed(2)}</td><td class="num">CHF ${Number(row.valueChf || 0).toFixed(2)}</td></tr>`).join('')
    : '<tr><td colspan="6">No effective holdings rows available.</td></tr>';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Portfolio Summary Page: ${escapeHtml(summary.portfolio || 'unknown')}</title>
<style>
:root {
  --bg: #06121f;
  --bg-accent: #10263f;
  --surface: rgba(10, 20, 35, 0.88);
  --line: rgba(148, 163, 184, 0.16);
  --text: #e5eef8;
  --muted: #97a6ba;
  --good: #22c55e;
  --warn: #f59e0b;
  --bad: #f87171;
  --color-healthy: #22c55e;
  --color-warning: #f59e0b;
  --color-blocked: #f87171;
}
* { box-sizing: border-box; }
body { margin: 0; padding: 28px; color: var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.18), transparent 28%), radial-gradient(circle at top right, rgba(34, 197, 94, 0.12), transparent 24%), linear-gradient(180deg, var(--bg-accent) 0%, var(--bg) 56%, #040914 100%); }
.report-container { max-width: 1180px; margin: 0 auto; }
.hero { padding: 30px; border-radius: 28px; background: linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(15, 23, 42, 0.9) 42%, rgba(34, 197, 94, 0.12)); border: 1px solid var(--line); box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28); }
.eyebrow { font-size: 12px; text-transform: uppercase; letter-spacing: 0.18em; color: #c7d8ea; }
.hero h1 { margin: 10px 0 8px; font-size: 2.25rem; line-height: 1.05; letter-spacing: -0.04em; }
.hero p { margin: 0; max-width: 72ch; color: var(--muted); line-height: 1.6; }
.badge-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.badge { display: inline-flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 999px; border: 1px solid var(--line); background: rgba(7, 18, 31, 0.62); color: var(--text); font-size: 12px; }
.grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 18px; margin-top: 18px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 24px; padding: 22px; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.18); }
.card h2 { margin: 0 0 14px; font-size: 1rem; letter-spacing: -0.02em; }
.panel-12 { grid-column: span 12; } .panel-8 { grid-column: span 8; } .panel-6 { grid-column: span 6; } .panel-4 { grid-column: span 4; }
.kpi-grid { grid-column: span 12; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.kpi { padding: 18px; border-radius: 20px; background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015)); border: 1px solid var(--line); }
.kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
.kpi-value { margin-top: 10px; font-size: 1.7rem; font-weight: 800; letter-spacing: -0.04em; }
.kpi-detail { margin-top: 6px; color: var(--muted); font-size: 12px; }
.management-callout { padding: 18px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.22); background: linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(59, 130, 246, 0.06)); line-height: 1.7; }
.allocation-bars { display: grid; gap: 12px; }
.allocation-bar-card { padding: 14px; border-radius: 18px; background: rgba(255,255,255,0.02); border: 1px solid rgba(148, 163, 184, 0.12); }
.allocation-bar-head { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; font-size: 13px; color: var(--muted); }
.allocation-track { height: 12px; border-radius: 999px; background: rgba(148, 163, 184, 0.15); overflow: hidden; }
.allocation-fill { height: 12px; border-radius: 999px; }
.bar-positive { background: linear-gradient(90deg, #22c55e, #4ade80); } .bar-warning { background: linear-gradient(90deg, #f59e0b, #fbbf24); } .bar-negative { background: linear-gradient(90deg, #ef4444, #f87171); }
.table-wrap { overflow-x: auto; border-radius: 18px; }
.table-wrap table { width: 100%; border-collapse: collapse; min-width: 720px; }
.table-wrap th, .table-wrap td { padding: 11px 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.12); font-size: 14px; vertical-align: top; }
.table-wrap th { color: var(--muted); text-align: left; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
.table-wrap tbody tr:nth-child(even) { background: rgba(255,255,255,0.02); }
.table-wrap tbody tr:hover { background: rgba(56, 189, 248, 0.06); }
.num { text-align: right; }
.list-panel { margin: 0; padding-left: 20px; } .list-panel li { margin-bottom: 10px; }
.list-subtle { margin-top: 4px; color: var(--muted); font-size: 13px; }
.queue-pill { display: inline-block; margin-right: 8px; padding: 3px 8px; border-radius: 999px; background: rgba(56, 189, 248, 0.12); color: #bfe8ff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
.tone-positive { color: var(--good); } .tone-warning { color: var(--warn); } .tone-negative { color: var(--bad); } .empty-state { color: var(--muted); }
@media (max-width: 960px) { .panel-8, .panel-6, .panel-4 { grid-column: span 12; } .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { body { padding: 16px; } .hero { padding: 22px; } .hero h1 { font-size: 1.7rem; } .kpi-grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="report-container">
  <section class="hero">
    <div class="eyebrow">Investor dashboard</div>
    <h1>Portfolio Summary Page: ${escapeHtml(summary.portfolio || 'unknown')}</h1>
    <p class="${toneClass}">Current health is ${escapeHtml(summary.status?.health || 'unknown')}. ${escapeHtml(summary.recommendedNextStep || 'No recommendation available.')}</p>
    <div class="badge-row">
      <span class="badge">Total value CHF ${totalValue.toFixed(2)}</span>
      <span class="badge">Invested CHF ${invested.toFixed(2)}</span>
      <span class="badge">Gain since purchase CHF ${gain.toFixed(2)} (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%)</span>
      <span class="badge">Cash CHF ${cash.toFixed(2)}</span>
      <span class="badge">Pending actions ${pendingCount}</span>
    </div>
  </section>
  <div class="grid">
    <section class="kpi-grid">
      <div class="kpi"><div class="kpi-label">Portfolio value</div><div class="kpi-value">CHF ${totalValue.toFixed(2)}</div><div class="kpi-detail">Latest snapshot ${escapeHtml(summary.holdings?.latestSnapshotDate || 'unknown')}</div></div>
      <div class="kpi"><div class="kpi-label">Gain since purchase</div><div class="kpi-value ${gain >= 0 ? 'tone-positive' : 'tone-negative'}">CHF ${gain.toFixed(2)}</div><div class="kpi-detail">${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%</div></div>
      <div class="kpi"><div class="kpi-label">Cash balance</div><div class="kpi-value">CHF ${cash.toFixed(2)}</div><div class="kpi-detail">Holdings ${Number(summary.holdings?.holdingCount || 0)}</div></div>
      <div class="kpi"><div class="kpi-label">Top blocker</div><div class="kpi-value" style="font-size:1.05rem;line-height:1.35;">${escapeHtml(topBlocker)}</div><div class="kpi-detail">Broker health ${escapeHtml(summary.status?.brokerHealth || 'unknown')}</div></div>
    </section>
    <section class="card panel-8"><h2>Management summary</h2><div class="management-callout">${escapeHtml(summary.recommendedNextStep || 'No recommendation available.')}<div style="margin-top:14px;color:var(--muted);font-size:13px;line-height:1.7;"><div>Live readiness: ${escapeHtml(liveReadinessLabel)}</div><div>Live arm state: ${escapeHtml(liveArmLabel)}</div><div>Live readiness next step: ${escapeHtml(liveReadinessNextStep)}</div></div></div></section>
    <section class="card panel-4"><h2>Immediate status</h2><ul><li>Health: ${escapeHtml(summary.status?.health || 'unknown')}</li><li>Strategy status: ${escapeHtml(summary.status?.strategy || 'unknown')}</li><li>Broker health: ${escapeHtml(summary.status?.brokerHealth || 'unknown')}</li><li>Execution posture: ${escapeHtml(summary.status?.executionPosture || 'unknown')}</li><li>Delivery posture: ${escapeHtml(summary.status?.deliveryPosture || 'unknown')}</li><li>Data freshness: ${escapeHtml(summary.status?.dataFreshness || 'unknown')}</li></ul></section>
    <section class="card panel-12"><h2>Effective holdings</h2><div class="table-wrap"><table><thead><tr><th>Ticker / ISIN</th><th>Name</th><th>Asset class</th><th class="num">Quantity</th><th class="num">Price CHF</th><th class="num">Value CHF</th></tr></thead><tbody>${holdingRowsHtml}</tbody><tfoot><tr><th colspan="5">Total</th><th class="num">CHF ${holdingTotalChf.toFixed(2)}</th></tr></tfoot></table></div></section>
    <section class="card panel-12"><h2>Instrument actions</h2><div class="table-wrap"><table><thead><tr><th>Ticker / ISIN</th><th>Name</th><th>Asset class</th><th class="num">Target %</th><th>Latest proposal status</th><th>Approval</th></tr></thead><tbody>${instrumentTable}</tbody></table></div></section>
    <section class="card panel-6"><h2>Why This Portfolio Looks This Way</h2><ol>${whyList}</ol></section>
    <section class="card panel-6"><h2>Recent material events</h2><ul>${eventList}</ul></section>
    <section class="card panel-12"><h2>Operator Queue Summary</h2><div class="badge-row" style="margin-top:0;margin-bottom:14px;"><span class="badge">Total ${Number(summary.operatorQueue?.summary?.total || 0)}</span><span class="badge">Blocking ${Number(summary.operatorQueue?.summary?.blocking || 0)}</span><span class="badge">Approval ${Number(summary.operatorQueue?.summary?.approvals || 0)}</span><span class="badge">Fresh actionable approvals ${Number(summary.operatorQueue?.summary?.freshApprovals || 0)}</span><span class="badge">Stale approvals needing reapproval ${Number(summary.operatorQueue?.summary?.staleApprovals || 0)}</span><span class="badge">Open-runner first handoffs ${Number(summary.operatorQueue?.summary?.openRunnerQueue || 0)}</span><span class="badge">Open-runner retries ${Number(summary.operatorQueue?.summary?.openRunnerRetry || 0)}</span></div><ol>${queueList}</ol></section>
    <section class="card panel-6"><h2>Execution Posture</h2><ul><li>Proposed trades: ${summary.approvals?.proposedCount || 0}</li><li>Approved trades: ${summary.approvals?.approvedCount || 0}</li><li>Fresh actionable approvals: ${summary.approvals?.freshApprovedCount || 0}</li><li>Stale approvals needing reapproval: ${summary.approvals?.staleApprovalCount || 0}</li><li>Pending approvals: ${summary.approvals?.pendingApprovalCount || 0}</li><li>Queued for open runner: ${summary.execution?.tradeState?.queuedForOpenRunner || 0}</li><li>Queued retries: ${summary.execution?.openRunnerRetryState?.queuedRetry || 0}</li><li>Blocked rows: ${summary.execution?.tradeState?.blocked || 0}</li><li>In-flight rows: ${summary.execution?.inFlightCount || 0}</li><li>Failed rows: ${summary.execution?.failedCount || 0}</li></ul></section>
    <section class="card panel-6"><h2>Observability Status</h2><ul><li>Runtime event file present: ${summary.observability?.eventsPresent ? 'yes' : 'no'}</li><li>Recent runtime events scanned: ${summary.observability?.recentSummary?.total || 0}</li><li>Blocked execution-policy events: ${summary.observability?.recentSummary?.blockedTrades || 0}</li><li>Open-runner first handoff events: ${summary.observability?.recentSummary?.openRunnerQueueEvents || 0}</li><li>Open-runner retry events: ${summary.observability?.recentSummary?.openRunnerRetryEvents || 0}</li><li>Degraded broker events: ${summary.observability?.recentSummary?.degradedBrokerEvents || 0}</li><li>Stale-data events: ${summary.observability?.recentSummary?.staleDataEvents || 0}</li></ul></section>
    <section class="card panel-12"><h2>Recommended Next Step</h2><p>${escapeHtml(summary.recommendedNextStep || 'No recommendation available.')}</p></section>
    <section class="card panel-12"><h2>Allocation health</h2><div class="table-wrap"><table><thead><tr><th>Asset class</th><th class="num">Current %</th><th class="num">Target %</th><th class="num">Drift %</th><th>Status</th></tr></thead><tbody>${allocationTable}</tbody></table></div></section>
    <section class="card panel-12"><h2>Contract Intelligence Readiness</h2><p>${escapeHtml(summary.contractIntelligence?.summaryLine || 'No contract-intelligence summary available.')}</p><p class="list-subtle">Recommended contract-intelligence action: ${escapeHtml(summary.contractIntelligence?.nextAction || 'No contract-intelligence remediation suggested.')}</p></section>
  </div>
</div>
</body>
</html>`;
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

  const brokerBlockRows = Array.isArray(summary.execution?.blockedRows) ? summary.execution.blockedRows : [];
  const brokerBlockLines = brokerBlockRows.length
    ? brokerBlockRows.map((item, index) => `${index + 1}. [${item.blockCode || 'blocked'}] ${item.tickerOrIsin || 'unknown'}${item.name ? ` — ${item.name}` : ''}\n   - Reason: ${item.blockReason || 'No broker block reason recorded.'}\n   - Next action: ${item.nextAction || 'No next action recorded.'}\n   - Broker order id: ${item.brokerOrderId || 'n/a'}`).join('\n')
    : '1. No broker-blocked trade rows are currently recorded.';

  const onboardingSection = onboarding
    ? `## Onboarding Workflow\n- Completion: ${onboarding.completionPct}%\n- Answered questions: ${onboarding.answeredCount}/${onboarding.totalQuestions}\n- Pending questions: ${onboarding.pendingCount}\n- Ready for activation-question gate: ${onboarding.readyForActivationQuestions ? 'yes' : 'no'}\n- Next step: ${onboarding.nextStep}\n\n### Onboarding Sections\n${(onboarding.sections || []).length ? onboarding.sections.map((section) => `- ${section.label}: ${section.pendingCount} pending`).join('\n') : '- No pending onboarding sections.'}\n\n` : '';

  return `# Portfolio Summary Page: ${summary.portfolio || 'unknown'}\n\n## Status Snapshot\n- Generated at: ${summary.generatedAt || 'unknown'}\n- Health: ${summary.status?.health || 'unknown'}\n- Strategy status: ${summary.status?.strategy || 'unknown'}\n- Broker health: ${summary.status?.brokerHealth || 'unknown'}\n- Execution posture: ${summary.status?.executionPosture || 'unknown'}\n- Delivery posture: ${summary.status?.deliveryPosture || 'unknown'}\n- Data freshness: ${summary.status?.dataFreshness || 'unknown'}\n- Live readiness: ${summary.readiness ? (summary.readiness.ok ? 'ready' : 'blocked') : 'not-evaluated'}\n- Live arm state: ${summary.readiness ? (summary.readiness.armedForMarketOpen ? `armed until ${summary.readiness.armExpiresAt || 'unknown'}` : 'not armed') : 'not-evaluated'}\n- Live readiness next step: ${summary.readiness?.recommendedNextAction || 'n/a'}\n- Self-heal dry-run next step: ${summary.selfHealPlan?.health?.nextAction || 'No self-heal action suggested.'}\n\n## Why This Portfolio Looks This Way\n- Drift: ${summary.explanations?.biggestDrift || 'No drift explanation available.'}\n- Execution: ${summary.explanations?.executionBlock || 'No execution explanation available.'}\n- Approvals: ${summary.explanations?.approvalBacklog || 'No approval explanation available.'}\n- Trade posture: ${summary.explanations?.noTradePosture || 'No trade-posture explanation available.'}\n\n## Holdings Snapshot\n- Total value CHF: ${summary.holdings?.totalValueChf || 0}\n- Cash CHF: ${summary.holdings?.cashChf || 0}\n- Invested CHF: ${summary.holdings?.investedChf || 0}\n- Holding count: ${summary.holdings?.holdingCount || 0}\n- Last sync: ${summary.holdings?.lastSyncAt || 'unknown'}\n- Latest snapshot date: ${summary.holdings?.latestSnapshotDate || 'unknown'}\n\n## Recommended Next Step\n- ${summary.recommendedNextStep || 'No recommendation available.'}\n\n## Operator Queue Summary\n- Total queue items: ${summary.operatorQueue?.summary?.total || 0}\n- Blocking items: ${summary.operatorQueue?.summary?.blocking || 0}\n- Approval items: ${summary.operatorQueue?.summary?.approvals || 0}\n- Fresh actionable approvals: ${summary.operatorQueue?.summary?.freshApprovals || 0}\n- Stale approvals needing reapproval: ${summary.operatorQueue?.summary?.staleApprovals || 0}\n- Open-runner first handoffs: ${summary.operatorQueue?.summary?.openRunnerQueue || 0}\n- Open-runner retries: ${summary.operatorQueue?.summary?.openRunnerRetry || 0}\n- Recovery items: ${summary.operatorQueue?.summary?.recovery || 0}\n- Warning items: ${summary.operatorQueue?.summary?.warnings || 0}\n\n## Contract Intelligence Readiness\n- ${summary.contractIntelligence?.summaryLine || 'No contract-intelligence summary available.'}\n- Recommended contract-intelligence action: ${summary.contractIntelligence?.nextAction || 'No contract-intelligence remediation suggested.'}\n\n## Operator Queue Items\n${queueLines}\n\n## Blockers\n${blockerLines}\n\n## Execution Posture\n- Proposed trades: ${summary.approvals?.proposedCount || 0}\n- Approved trades: ${summary.approvals?.approvedCount || 0}\n- Fresh actionable approvals: ${summary.approvals?.freshApprovedCount || 0}\n- Stale approvals needing reapproval: ${summary.approvals?.staleApprovalCount || 0}\n- Pending approvals: ${summary.approvals?.pendingApprovalCount || 0}\n- Queued for open runner: ${summary.execution?.tradeState?.queuedForOpenRunner || 0}\n- Queued retries: ${summary.execution?.openRunnerRetryState?.queuedRetry || 0}\n- Blocked rows: ${summary.execution?.tradeState?.blocked || 0}\n- In-flight rows: ${summary.execution?.inFlightCount || 0}\n- Failed rows: ${summary.execution?.failedCount || 0}\n\n## Broker Block Details\n${brokerBlockLines}\n\n## Observability Status\n- Runtime event file present: ${summary.observability?.eventsPresent ? 'yes' : 'no'}\n- Recent runtime events scanned: ${summary.observability?.recentSummary?.total || 0}\n- Blocked execution-policy events: ${summary.observability?.recentSummary?.blockedTrades || 0}\n- Open-runner first handoff events: ${summary.observability?.recentSummary?.openRunnerQueueEvents || 0}\n- Open-runner retry events: ${summary.observability?.recentSummary?.openRunnerRetryEvents || 0}\n- Degraded broker events: ${summary.observability?.recentSummary?.degradedBrokerEvents || 0}\n- Stale-data events: ${summary.observability?.recentSummary?.staleDataEvents || 0}\n\n## Allocation\n| Asset class | Current % | Target % | Drift % | Status |\n|---|---:|---:|---:|---|\n${allocationTable}\n\n## Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Latest proposal status | Approval |\n|---|---|---|---:|---|---|\n${instrumentTable}\n\n${onboardingSection}## Recent Material Events\n${eventLines}\n`;
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
    writeJsonIfChanged(outPath, summary);
    writeTextIfChanged(htmlPath, renderPortfolioSummaryHtml(summary));
    writeJsonIfChanged(recoveryPath, checklist);
    writeTextIfChanged(recoveryMarkdownPath, recoveryMarkdown);
    writeTextIfChanged(recoveryHtmlPath, markdownToBasicHtml(recoveryMarkdown));
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
  const portfolios = summaries.map((summary) => {
    const brokerBlocks = Array.isArray(summary.execution?.blockedRows) ? summary.execution.blockedRows : [];
    const topBrokerBlock = brokerBlocks[0] || null;
    return {
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
      blockedTradeCount: brokerBlocks.length,
      topBrokerBlock: topBrokerBlock ? {
        tickerOrIsin: topBrokerBlock.tickerOrIsin || '',
        name: topBrokerBlock.name || '',
        blockCode: topBrokerBlock.blockCode || '',
        blockReason: topBrokerBlock.blockReason || '',
        nextAction: topBrokerBlock.nextAction || '',
        brokerOrderId: topBrokerBlock.brokerOrderId || '',
      } : null,
      driftStatuses: summary.allocation.map((row) => ({ assetClass: row.assetClass, status: row.status, driftPct: row.driftPct })),
      brokerHealth: summary.status.brokerHealth,
      executionPosture: summary.status.executionPosture,
      deliveryPosture: summary.status.deliveryPosture,
      dataFreshness: summary.status.dataFreshness,
    };
  });

  return {
    schemaVersion: '1.1',
    generatedAt: new Date().toISOString(),
    portfolioCount: portfolios.length,
    totalValueChf: Number(portfolios.reduce((sum, item) => sum + Number(item.totalValueChf || 0), 0).toFixed(2)),
    portfolios,
    queueSummary: summarizeOperatorQueue(summaries.flatMap((summary) => summary.operatorQueue?.items || [])),
  };
}

function buildPendingActionsOverview(summaries = [], options = {}) {
  const rootDir = options.rootDir || null;
  const reproposalSurface = rootDir ? require('./reproposalSurface') : null;
  const circuitBreakerSurface = rootDir ? (() => { try { return require('./circuitBreakerSurface'); } catch (_) { return null; } })() : null;
  const reproposalItems = reproposalSurface
    ? summaries.flatMap((summary) => reproposalSurface
        .listLatestPendingReproposals({ rootDir, portfolio: summary.portfolio })
        .map((rep) => {
          const desc = reproposalSurface.describeReproposalItem({ portfolio: summary.portfolio, reproposal: rep });
          return { ...desc, severity: 'high' };
        }))
    : [];
  // Phase 199: surface tripped circuit breakers with severity 'high' (critical sub-classification on the item).
  const breakerItems = circuitBreakerSurface
    ? circuitBreakerSurface.listCircuitBreakerSurfaceItems({ rootDir })
        .filter((item) => summaries.some((s) => s.portfolio === item.portfolio))
        .map((item) => ({ ...item, severity: 'high', status: 'blocked', queueType: 'attention' }))
    : [];
  const items = [
    ...breakerItems,
    ...reproposalItems,
    ...summaries.flatMap((summary) => (summary.operatorQueue?.items || []).map((item) => ({ ...item }))),
  ];
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

// Phase W8: explanation builders (group-aware, operator-facing).
function explainActionable(item = {}) {
  if (item.kind === 'basket_reproposal_pending') {
    return `Latest reproposal v${item.reproposalVersion} is within the approval window and ready for a single approve.`;
  }
  if (item.status === 'basket_approved') {
    return item.explanation || 'Approved basket is executable now; awaiting transmit.';
  }
  if (item.queueType === 'attention') {
    return item.explanation || item.summary || 'Tripped circuit breaker requires operator attention before approvals proceed.';
  }
  if (item.status === 'pending_user_approval') {
    return 'Fresh proposal within the approval window — awaiting operator approve/reject.';
  }
  if (item.status === 'ready_for_review') {
    return 'Reviewed approval item ready to advance into the next workflow step.';
  }
  return item.explanation || item.summary || 'Actionable approval item.';
}

function explainStale(stale = {}) {
  const ageHours = Number(stale.approvalAgeHours);
  const ageText = Number.isFinite(ageHours) ? `${ageHours.toFixed(1)}h` : 'past the staleness threshold';
  return `Approved ${ageText} ago; market conditions may have changed — refresh approval before live submission.`;
}

function explainSuperseded(rep = {}, latest = {}) {
  const latestVersion = latest.version != null ? `v${latest.version}` : 'a newer version';
  const latestDate = latest.createdAt ? ` created ${latest.createdAt}` : '';
  return `Superseded by reproposal ${latestVersion}${latestDate}; approve the newer row instead.`;
}

function buildApprovalsQueue(summaries = [], options = {}) {
  const rootDir = options.rootDir || null;
  const reproposalSurface = rootDir ? require('./reproposalSurface') : null;
  const circuitBreakerSurface = rootDir ? (() => { try { return require('./circuitBreakerSurface'); } catch (_) { return null; } })() : null;
  const items = summaries.flatMap((summary) => {
    const queueItems = Array.isArray(summary.operatorQueue?.items) ? summary.operatorQueue.items : [];
    const basketApprovedCount = Number(summary.readiness?.approvalState?.basketApprovalState?.approvedCount || 0);
    const basketExecutableCount = Number(summary.readiness?.approvalState?.basketApprovalState?.executableCount || 0);
    const basketItems = basketExecutableCount > 0 ? [{
      portfolio: summary.portfolio,
      urgency: 'medium',
      status: 'basket_approved',
      summary: `${basketApprovedCount} approved basket(s) are ready for execution.`,
      explanation: `${basketExecutableCount} approved basket(s) are executable now; row-level proposed trades remain legacy context.`,
      effectIfApproved: 'The operator can transmit the approved basket without re-approving row-level trade log entries.',
      effectIfIgnored: 'The basket remains ready but unsubmitted, so the portfolio stays staged instead of executing.',
      recommendedOperatorAction: 'Review the approved basket and submit when satisfied with the price bands and market window.',
      queueType: 'approval',
      severity: 'medium',
      group: 'actionable',
    }] : [];

    // Phase W8: split reproposals into latest-per-parent (actionable) vs older versions (superseded).
    let reproposalActionable = [];
    let reproposalSuperseded = [];
    if (reproposalSurface) {
      const all = reproposalSurface.listPendingReproposals({ rootDir, portfolio: summary.portfolio });
      const latestByParent = new Map();
      for (const rep of all) {
        const existing = latestByParent.get(rep.parentApprovalId);
        if (!existing || rep.version > existing.version) latestByParent.set(rep.parentApprovalId, rep);
      }
      for (const rep of all) {
        const latest = latestByParent.get(rep.parentApprovalId);
        const item = reproposalSurface.describeReproposalItem({ portfolio: summary.portfolio, reproposal: rep });
        if (latest && rep === latest) {
          reproposalActionable.push({ ...item, group: 'actionable' });
        } else {
          reproposalSuperseded.push({
            ...item,
            group: 'superseded',
            urgency: 'low',
            severity: 'low',
            status: 'superseded',
            supersededByVersion: latest ? latest.version : null,
            supersededByApprovalId: latest ? latest.approvalId : null,
            supersededByCreatedAt: latest ? latest.createdAt : null,
            summary: `Reproposal v${rep.version} superseded by v${latest ? latest.version : '?'} for parent ${rep.parentApprovalId}.`,
            explanation: explainSuperseded(rep, latest || {}),
            effectIfApproved: 'Approving this older version is blocked — it has been replaced; approve the newer reproposal instead.',
            effectIfIgnored: 'No action needed; the legacy version is retained as context only and will not transmit.',
            recommendedOperatorAction: latest
              ? `Approve the newer v${latest.version} reproposal for parent ${rep.parentApprovalId} instead of this row.`
              : 'Review the newer reproposal for this parent and approve it instead.',
          });
        }
      }
    }

    // Phase 199: tripped circuit breakers surface above approvals (always actionable).
    const breakerItems = circuitBreakerSurface
      ? circuitBreakerSurface.listCircuitBreakerSurfaceItems({ rootDir })
          .filter((item) => item.portfolio === summary.portfolio)
          .map((item) => ({ ...item, urgency: 'high', queueType: 'attention', group: 'actionable' }))
      : [];

    // Phase W8: stale approvals surfaced as their own row-level items.
    const staleApprovalRows = Array.isArray(summary.approvals?.staleApprovals) ? summary.approvals.staleApprovals : [];
    const staleItems = staleApprovalRows.map((stale) => ({
      portfolio: summary.portfolio,
      urgency: 'high',
      severity: 'high',
      status: 'stale_needs_reapproval',
      queueType: 'approval',
      group: 'stale',
      tickerOrIsin: stale.tickerOrIsin || '',
      action: stale.action || '',
      approvalAgeHours: stale.approvalAgeHours,
      summary: `Stale approval: ${(stale.action || '').toUpperCase()} ${stale.tickerOrIsin || ''}${stale.name ? ` (${stale.name})` : ''} approved ${Number.isFinite(Number(stale.approvalAgeHours)) ? `${Number(stale.approvalAgeHours).toFixed(1)}h` : ''} ago.`,
      explanation: explainStale(stale),
      effectIfApproved: 'Refreshing the proposal and re-approving the latest row arms it for live submission again.',
      effectIfIgnored: 'The row stays blocked from live submission until the approval is refreshed.',
      recommendedOperatorAction: stale.reapproveGuidance || 'Run scripts/trade.js refresh-stale-approvals to regenerate, then approve only the latest refreshed row.',
      refreshCommand: stale.refreshCommand || null,
    }));

    const queueApprovalItems = queueItems
      .filter((item) => ['approval'].includes(item.queueType || queueTypeForItem(item)) || item.kind === 'approval')
      // Phase W8: stale approvals are surfaced separately as row-level items;
      // suppress the aggregate queue summary so we don't double-count.
      .filter((item) => item.status !== 'stale_needs_reapproval')
      .map((item) => ({
        portfolio: summary.portfolio,
        urgency: approvalUrgencyForItem(item),
        status: item.status,
        summary: item.summary,
        explanation: explainActionable({ ...item, queueType: item.queueType || queueTypeForItem(item) }),
        effectIfApproved: item.status === 'pending_user_approval'
          ? 'The operator can move this proposal from review into the next staging / execution decision step.'
          : 'The operator can advance the reviewed item into the next workflow step with fewer manual joins.',
        effectIfIgnored: 'The approval backlog remains open, and the related portfolio workflow stays delayed or ambiguous.',
        recommendedOperatorAction: item.recommendedOperatorAction || 'Review and resolve the approval item explicitly.',
        queueType: item.queueType || queueTypeForItem(item),
        severity: item.severity,
        group: 'actionable',
      }));

    return [
      ...breakerItems,
      ...reproposalActionable,
      ...basketItems,
      ...queueApprovalItems,
      ...staleItems,
      ...reproposalSuperseded,
    ];
  });

  // Phase W8: sort by group first (actionable -> stale -> superseded), then
  // preserve the existing urgency / portfolio / summary tiebreakers within a
  // group so legacy ordering is unchanged for the actionable section.
  const groupRank = { actionable: 0, stale: 1, superseded: 2 };
  const urgencyRank = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => {
    const aGroup = a.group || 'actionable';
    const bGroup = b.group || 'actionable';
    return (groupRank[aGroup] ?? 99) - (groupRank[bGroup] ?? 99)
      || (urgencyRank[a.urgency] ?? 99) - (urgencyRank[b.urgency] ?? 99)
      || String(a.portfolio).localeCompare(String(b.portfolio))
      || String(a.summary).localeCompare(String(b.summary));
  });

  const enrichedItems = items.map((item, index) => ({
    ...item,
    rank: index + 1,
    group: item.group || 'actionable',
    explanation: item.explanation || explainActionable(item),
  }));

  // Build per-group summary referencing item ranks (helps consumers render).
  const groups = { actionable: { count: 0, ranks: [] }, stale: { count: 0, ranks: [] }, superseded: { count: 0, ranks: [] } };
  for (const item of enrichedItems) {
    const g = item.group || 'actionable';
    if (!groups[g]) groups[g] = { count: 0, ranks: [] };
    groups[g].count += 1;
    groups[g].ranks.push(item.rank);
  }

  return {
    schemaVersion: '1.1',
    generatedAt: new Date().toISOString(),
    itemCount: enrichedItems.length,
    items: enrichedItems,
    groups,
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
      const aBlockedTrades = Array.isArray(a.execution?.blockedRows) ? a.execution.blockedRows.length : 0;
      const bBlockedTrades = Array.isArray(b.execution?.blockedRows) ? b.execution.blockedRows.length : 0;
      return (healthRank[a.status?.health] ?? 99) - (healthRank[b.status?.health] ?? 99)
        || bBlockedTrades - aBlockedTrades
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
      blockedTradeCount: Array.isArray(highlightedPortfolio.execution?.blockedRows) ? highlightedPortfolio.execution.blockedRows.length : 0,
      topBrokerBlock: Array.isArray(highlightedPortfolio.execution?.blockedRows) && highlightedPortfolio.execution.blockedRows.length
        ? {
            tickerOrIsin: highlightedPortfolio.execution.blockedRows[0].tickerOrIsin || '',
            name: highlightedPortfolio.execution.blockedRows[0].name || '',
            blockCode: highlightedPortfolio.execution.blockedRows[0].blockCode || '',
            blockReason: highlightedPortfolio.execution.blockedRows[0].blockReason || '',
            nextAction: highlightedPortfolio.execution.blockedRows[0].nextAction || '',
          }
        : null,
      recommendedNextStep: highlightedPortfolio.recommendedNextStep,
      whyNow: Array.isArray(highlightedPortfolio.execution?.blockedRows) && highlightedPortfolio.execution.blockedRows.length
        ? (highlightedPortfolio.execution.blockedRows[0].blockReason || highlightedPortfolio.explanations?.executionBlock || highlightedPortfolio.explanations?.approvalBacklog || 'No highlighted explanation available.')
        : (highlightedPortfolio.explanations?.executionBlock || highlightedPortfolio.explanations?.approvalBacklog || 'No highlighted explanation available.'),
    } : null,
  };
}

function renderDailySummaryMarkdown(daily = {}) {
  const drift = daily.biggestDrift;
  const highlight = daily.highlightedPortfolio;
  return `# Daily Summary Page\n\n## Headline\n- Overall health: ${daily.healthHeadline || 'unknown'}\n- Portfolios tracked: ${daily.totals?.portfolioCount || 0}\n- Cash waiting to deploy CHF: ${daily.cashWaitingToDeployChf || 0}\n- Pending approvals: ${daily.pendingApprovals || 0}\n- Broker health: ${daily.brokerHealth || 'unknown'}\n- Reporting health: ${daily.reportingHealth || 'unknown'}\n- Recommended next step: ${daily.recommendedNextStep || 'No recommendation available.'}\n\n## Biggest Drift Today\n- ${drift ? `${drift.portfolio}: ${drift.assetClass} drift ${drift.driftPct}% (${drift.status})` : 'No drift data available.'}\n- Why it matters: ${daily.biggestDriftWhy || 'No drift explanation available.'}\n\n## Highlighted Portfolio\n- Portfolio: ${highlight?.portfolio || 'none'}\n- Health: ${highlight?.health || 'unknown'}\n- Cash CHF: ${highlight?.cashChf || 0}\n- Broker health: ${highlight?.brokerHealth || 'unknown'}\n- Delivery posture: ${highlight?.deliveryPosture || 'unknown'}\n- Pending approvals: ${highlight?.pendingApprovals || 0}\n- Broker-blocked rows: ${highlight?.blockedTradeCount || 0}\n- Top broker block: ${highlight?.topBrokerBlock ? `${highlight.topBrokerBlock.blockCode}${highlight.topBrokerBlock.tickerOrIsin ? ` (${highlight.topBrokerBlock.tickerOrIsin})` : ''}` : 'none'}\n- Recommended next step: ${highlight?.recommendedNextStep || 'No recommendation available.'}\n- Why now: ${highlight?.whyNow || 'No highlighted explanation available.'}\n`;
}

function renderApprovalsQueueMarkdown(queue = {}) {
  const renderItem = (item) => {
    const lines = [
      `### Approval ${item.rank}: ${item.portfolio}`,
      `- Urgency: ${item.urgency}`,
      `- Summary: ${item.summary}`,
      `- Explanation: ${item.explanation}`,
    ];
    // Phase 204: surface envelope annotations when present.
    if (item.requiresOperatorAttention) {
      const tiers = item.quoteQualitySummary?.tiers || {};
      const tierLine = Object.entries(tiers).map(([t, c]) => `${t}=${c}`).join(', ');
      lines.push(`- ⚠️ Requires attention: degraded quote quality (${tierLine || 'see envelope'})`);
    }
    if (item.currencyDeployment && Object.keys(item.currencyDeployment).length > 0) {
      const parts = Object.entries(item.currencyDeployment).map(([c, v]) => `${c} ${v}`).join(', ');
      lines.push(`- Native deployment: ${parts}`);
    }
    lines.push(`- Effect if approved: ${item.effectIfApproved}`);
    lines.push(`- Effect if ignored: ${item.effectIfIgnored}`);
    lines.push(`- Recommended action: ${item.recommendedOperatorAction}`);
    return lines.join('\n');
  };

  const allItems = Array.isArray(queue.items) ? queue.items : [];
  if (!allItems.length) {
    const placeholder = '### Approval 1: none\n- Urgency: low\n- Summary: No pending approval items.\n- Explanation: No approval-gated actions are currently waiting.\n- Effect if approved: No action required.\n- Effect if ignored: No approval backlog remains.\n- Recommended action: Continue normal monitoring.';
    return `# Approvals Queue\n\n## Summary\n- Generated at: ${queue.generatedAt || 'unknown'}\n- Approval items: ${queue.itemCount || 0}\n\n## Approval Review Queue\n\n${placeholder}\n`;
  }

  // Phase W8: render three group sections.
  const groupOrder = [
    { key: 'actionable', heading: 'Actionable now' },
    { key: 'stale', heading: 'Stale / needs refresh' },
    { key: 'superseded', heading: 'Regenerated (superseded)' },
  ];
  const sections = groupOrder.map(({ key, heading }) => {
    const groupItems = allItems.filter((item) => (item.group || 'actionable') === key);
    const body = groupItems.length
      ? groupItems.map(renderItem).join('\n\n')
      : '_(none)_';
    return `## ${heading}\n\n${body}`;
  }).join('\n\n');

  return `# Approvals Queue\n\n## Summary\n- Generated at: ${queue.generatedAt || 'unknown'}\n- Approval items: ${queue.itemCount || 0}\n- Actionable: ${queue.groups?.actionable?.count ?? 0}\n- Stale: ${queue.groups?.stale?.count ?? 0}\n- Superseded: ${queue.groups?.superseded?.count ?? 0}\n\n## Approval Review Queue\n\n${sections}\n`;
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
  const { evaluateDeliveryPosture } = require('./deliveryDiagnostic');
  const portfolioDirs = listPortfolioDirectories(repoRoot);
  const portfolios = [];
  for (const portfolioDir of portfolioDirs) {
    const posture = evaluateDeliveryPosture({ portfolioDir });
    const status = posture.status;
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
      deliveryPosture: posture.deliveryPosture,
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
    const brokerBlock = p.deliveryPosture?.brokerBlockContext?.topBrokerBlock;
    const brokerBlockSection = brokerBlock
      ? `\n- Broker block context:\n  - Count: ${p.deliveryPosture?.brokerBlockContext?.blockedTradeCount || 0}\n  - Top block: [${brokerBlock.blockCode || 'blocked'}] ${brokerBlock.tickerOrIsin || 'unknown'}${brokerBlock.name ? ` — ${brokerBlock.name}` : ''}\n  - Reason: ${brokerBlock.blockReason || 'No broker block reason recorded.'}\n  - Next action: ${brokerBlock.nextAction || 'No next action recorded.'}`
      : '';
    return `### ${p.portfolio}\n- Delivery mode: ${p.deliveryMode}\n- Channels: ${(p.intendedChannels || []).join(', ')}\n- External delivery: ${p.externalDeliveryEnabled ? 'enabled' : 'disabled'}\n- Failure alert mode: ${p.failureAlertMode}\n- Alert targets: ${(p.failureAlertTargets || []).join(', ')}\n- Policy override loaded: ${p.overrideLoaded ? 'yes' : 'no'}\n- Ready: ${p.ready ? 'yes' : 'no'}\n- Pending actions:\n${actions}${brokerBlockSection}`;
  }).join('\n\n');
  // Phase W2: surface the host delivery caveat alongside generated state
  // so operator-facing dashboards make the Telegram fail-closed posture
  // explicit. See docs/operations/cron.md.
  const hostFootnote = '\n## Host delivery posture\n\n' +
    '- Telegram chat channel has no chat-id target on this host; cron `announce` delivery always reports `no route, will fail-closed`.\n' +
    '- All cron jobs carry `bestEffort:true`, so this delivery failure does **not** corrupt cron state.\n' +
    '- **Email is the working operator channel.** Reports and digests reach Graham via Mailgun (`lancashire@swift.ch`).\n' +
    '- Reference: `docs/operations/cron.md`.\n';
  return `# Delivery & Alerting Status\n\n- Generated at: ${overview.generatedAt || 'unknown'}\n- Portfolios: ${overview.portfolioCount || 0}\n- All ready: ${overview.allReady ? 'yes' : 'no'}\n\n## Per-Portfolio Delivery Posture\n\n${portfolioSections}\n${hostFootnote}`;
}

function renderCockpitPage({ dailySummary = {}, approvalsQueue = {}, reportHistory = {}, summaries = [], deliveryOverview = {}, cronHealth = null, netLiqSparklineSvg = '' }) {
  const health = dailySummary.healthHeadline || 'unknown';
  const badgeClass = health === 'healthy' ? 'badge-healthy' : health === 'blocked' ? 'badge-blocked' : 'badge-warning';
  const drift = dailySummary.biggestDrift;
  const portfolioCards = summaries.map((s) => {
    const h = s.status?.health || 'unknown';
    const bc = h === 'healthy' ? 'badge-healthy' : h === 'blocked' ? 'badge-blocked' : 'badge-warning';
    return `<li><a href="../../portfolio/${s.portfolio}/summary.html">${s.portfolio}</a> <span class="badge ${bc}">${h}</span></li>`;
  }).join('\n');
  const deliveryBrokerBlockItems = (deliveryOverview.portfolios || [])
    .filter((p) => p.deliveryPosture?.brokerBlockContext?.topBrokerBlock)
    .map((p) => {
      const block = p.deliveryPosture.brokerBlockContext.topBrokerBlock;
      return `<li><strong>${p.portfolio}</strong>: [${block.blockCode || 'blocked'}] ${block.tickerOrIsin || 'unknown'}${block.name ? ` — ${block.name}` : ''}<br />Reason: ${block.blockReason || 'No broker block reason recorded.'}<br />Next action: ${block.nextAction || 'No next action recorded.'}</li>`;
    }).join('\n');
  const deliveryBrokerBlockSection = deliveryBrokerBlockItems
    ? `
<h2>Delivery Broker Blocks</h2>
<ul>
${deliveryBrokerBlockItems}
</ul>`
    : '';

  // Phase 206: cron health card section
  let cronHealthSection = '';
  if (cronHealth && Array.isArray(cronHealth.jobs) && cronHealth.jobs.length > 0) {
    const severityToBadge = { critical: 'badge-blocked', alert: 'badge-blocked', warning: 'badge-warning', stale: 'badge-warning', ok: 'badge-healthy' };
    const cronRows = cronHealth.jobs.map((j) => {
      const badge = severityToBadge[j.severity] || 'badge-info';
      const ageHrs = j.lastRunAgeHours != null ? `${j.lastRunAgeHours.toFixed(1)}h ago` : 'never';
      const errLine = j.lastError ? ` <span style="color:#dc2626;font-size:0.8em">(${String(j.lastError).slice(0, 80).replace(/[<>]/g, '')})</span>` : '';
      return `<li><span class="badge ${badge}">${j.severity}</span> <strong>${j.name}</strong> &mdash; ${j.consecutiveErrors} consecutive errors, last run ${ageHrs}${errLine}</li>`;
    }).join('\n');
    cronHealthSection = `\n<h2>Cron Health (${cronHealth.healthy}/${cronHealth.total} healthy)</h2>\n<ul>\n${cronRows}\n</ul>`;
  }

  // Phase 206: net-liq sparkline section
  const sparklineSection = netLiqSparklineSvg ? `\n<h2>Portfolio Trend (last days)</h2>\n<div style="padding:8px 0;">${netLiqSparklineSvg}</div>` : '';

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
</ul>${deliveryBrokerBlockSection}${cronHealthSection}${sparklineSection}

<p class="meta">Generated: ${new Date().toISOString()}</p>
</div>
</body>
</html>`;
}

async function generateOverviewArtifacts({ repoRoot = process.cwd(), writeFiles = true, readiness = null, cronHealth = null } = {}) {
  const portfolioDirs = listPortfolioDirectories(repoRoot);
  const summaries = [];
  for (const portfolioDir of portfolioDirs) {
    const portfolioReadiness = readiness && path.basename(portfolioDir) === 'etf' ? readiness : null;
    const { summary } = await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles, readiness: portfolioReadiness });
    summaries.push(summary);
  }
  const portfolioIndex = buildPortfolioIndex(summaries);
  const pendingActions = buildPendingActionsOverview(summaries, { rootDir: repoRoot });
  const approvalsQueue = buildApprovalsQueue(summaries, { rootDir: repoRoot });
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
    writeJsonIfChanged(portfolioIndexPath, portfolioIndex);
    writeJsonIfChanged(pendingActionsPath, pendingActions);
    writeJsonIfChanged(approvalsQueuePath, approvalsQueue);
    writeTextIfChanged(approvalsQueueMarkdownPath, approvalsQueueMarkdown);
    writeTextIfChanged(approvalsQueueHtmlPath, markdownToBasicHtml(approvalsQueueMarkdown));
    writeJsonIfChanged(dailySummaryPath, dailySummary);
    writeTextIfChanged(dailySummaryMarkdownPath, dailySummaryMarkdown);
    writeTextIfChanged(dailySummaryHtmlPath, markdownToBasicHtml(dailySummaryMarkdown));
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
    writeJsonIfChanged(reportHistoryPath, reportHistory);
    writeTextIfChanged(reportHistoryMarkdownPath, reportHistoryMarkdown);
    writeTextIfChanged(reportHistoryHtmlPath, markdownToBasicHtml(reportHistoryMarkdown));
    writeJsonIfChanged(deliveryStatusPath, deliveryOverview);
    writeTextIfChanged(deliveryStatusMarkdownPath, deliveryStatusMarkdown);
    writeTextIfChanged(deliveryStatusHtmlPath, markdownToBasicHtml(deliveryStatusMarkdown));
  }
  const cockpitHtmlPath = path.join(overviewDir, 'index.html');
  // Phase 206: compute net-liq sparkline from first portfolio with history data.
  let netLiqSparklineSvg = '';
  for (const s of summaries) {
    try {
      const dir = path.join(repoRoot, 'portfolio', s.portfolio);
      const series = lastNDays(readNetLiqHistory(dir), 30);
      if (series.length >= 2) {
        netLiqSparklineSvg = buildSparklineSvg(series.map((r) => r.totalChf), { width: 400, height: 60 });
        break;
      }
    } catch (_) {
      // try next
    }
  }
  if (writeFiles) {
    const cockpitHtml = renderCockpitPage({ dailySummary, approvalsQueue, reportHistory, summaries, deliveryOverview, cronHealth, netLiqSparklineSvg });
    writeTextIfChanged(cockpitHtmlPath, cockpitHtml);
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
  listBlockedTradeRows,
};
