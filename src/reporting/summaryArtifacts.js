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
const { buildPendingOperatorActions, buildMaterialEvents, bestNextStep } = require('./dashboardGenerator');
const { classifyActionSeverity, queueTypeForItem, summarizeOperatorQueue } = require('./operatorQueue');

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

function buildPendingActionItems({ portfolioName, deliveryStatus = null, brokerReadiness = null, brokerErrorState = null, lifecycleSummary = null, safetyDiagnostics = null, recommended = [], latestProposals = [] }) {
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

  for (const item of deliveryStatus?.pendingActions || []) {
    actions.push({
      portfolio: portfolioName,
      kind: 'delivery',
      severity: 'medium',
      status: 'pending',
      summary: item,
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
    const statusRank = { blocked: 0, degraded: 1, paused: 2, failed: 3, pending_user_approval: 4, ready_for_review: 5, in_flight: 6, pending: 7, stale: 8, warning: 9, recommended: 10 };
    return (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99)
      || (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99)
      || a.summary.localeCompare(b.summary);
  });
}

function buildPortfolioSummaryModel({ portfolioName, holdingsText, allocations = [], approvedInstruments = [], existingTrades = [], latestProposals = [], executionPlan = null, latestSnapshot = null, brokerReadiness = null, lifecycleSummary = null, freshness = null, brokerErrorState = null, deliveryStatus = null, observability = null, safetyDiagnostics = null, recentEvents = [] }) {
  const summary = parseHoldingsSummary(holdingsText);
  const totalValue = Number(summary.totalValue || 0);
  const holdingCount = countHoldingRows(holdingsText);
  const blockers = safetyDiagnostics?.blockers || [];
  const latestActions = recommendedActions(existingTrades, latestProposals, totalValue, brokerReadiness, lifecycleSummary);
  const pendingActions = buildPendingActionItems({
    portfolioName,
    deliveryStatus,
    brokerReadiness,
    brokerErrorState,
    lifecycleSummary,
    safetyDiagnostics,
    recommended: latestActions,
    latestProposals,
  });
  const health = healthLabel({ brokerReadiness, brokerErrorState, freshness, blockers, lifecycleSummary, pendingActions });
  const strategy = strategyStatus(allocations, brokerReadiness, blockers);
  const proposalTotals = proposalSummary(latestProposals, totalValue);
  const proposalByInstrument = latestProposalByInstrument(latestProposals);
  const recommendedNextStep = bestNextStep({
    pendingActions: pendingActions.map((item) => item.summary),
    blockers,
    recommendedActionsList: latestActions,
    brokerReadiness,
    lifecycleSummary,
  });
  const materialEvents = buildMaterialEvents(recentEvents);

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

async function collectPortfolioSummary({ portfolioDir }) {
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
    holdingsText,
    allocations,
    approvedInstruments,
    existingTrades: recentTrades(tradesPath),
    latestProposals,
    executionPlan: buildExecutionPlan({ portfolioPath, tradesPath, totalValue: Number(parseHoldingsSummary(holdingsText).totalValue || 0) }),
    latestSnapshot: latestHistory(historyPath),
    brokerReadiness,
    lifecycleSummary: executionLifecycleSummary(tradesPath),
    freshness,
    brokerErrorState: currentBrokerErrorState,
    deliveryStatus,
    observability,
    safetyDiagnostics: safetyEvaluation,
    recentEvents,
  });
}

async function generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles = true }) {
  const summary = await collectPortfolioSummary({ portfolioDir });
  const outPath = path.join(portfolioDir, 'summary.json');
  if (writeFiles) {
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2) + '\n');
  }
  return { summary, outPath };
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

async function generateOverviewArtifacts({ repoRoot = process.cwd(), writeFiles = true } = {}) {
  const portfolioDirs = listPortfolioDirectories(repoRoot);
  const summaries = [];
  for (const portfolioDir of portfolioDirs) {
    const { summary } = await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles });
    summaries.push(summary);
  }
  const portfolioIndex = buildPortfolioIndex(summaries);
  const pendingActions = buildPendingActionsOverview(summaries);
  const overviewDir = path.join(repoRoot, 'runtime', 'overview');
  const portfolioIndexPath = path.join(overviewDir, 'portfolio-index.json');
  const pendingActionsPath = path.join(overviewDir, 'pending-actions.json');
  if (writeFiles) {
    fs.mkdirSync(overviewDir, { recursive: true });
    fs.writeFileSync(portfolioIndexPath, JSON.stringify(portfolioIndex, null, 2) + '\n');
    fs.writeFileSync(pendingActionsPath, JSON.stringify(pendingActions, null, 2) + '\n');
  }
  return {
    summaries,
    portfolioIndex,
    pendingActions,
    portfolioIndexPath,
    pendingActionsPath,
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
  generatePortfolioSummaryArtifacts,
  listPortfolioDirectories,
  buildPortfolioIndex,
  buildPendingActionsOverview,
  generateOverviewArtifacts,
};
