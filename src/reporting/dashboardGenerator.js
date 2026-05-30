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
const { summarizeOperatorQueue } = require('./operatorQueue');
const { summarizeContractIntelligence } = require('./contractIntelligenceStatus');
const { writeTextIfChanged } = require('./artifactWriter');
const { loadFillNotificationState } = require('./fillNotificationState');
const { readTradesTable, summarizeOpenRunnerRetryState } = require('../execution/tradeState');
const { parseHoldingsTable } = require('./investorReportingData');
const { buildProfitLossSummary } = require('./costBasis');
const { resolveHoldingQuotes } = require('./quoteResolution');

function parseHoldingsSummary(text) {
  const get = (label, fallback = '0') => {
    const m = text.match(new RegExp(`- ${label}:\\s*(.+)`));
    return m ? m[1].trim() : fallback;
  };
  // Prefer the broker-account cash figure because it matches the value already rolled into
  // `Total value CHF` (total = invested + brokerCash). The `Portfolio cash CHF` line is
  // marked `broker_reported` until a portfolio-local accounting source is wired in, so
  // surfacing it as the dashboard's cash number falsely shows zero cash. Fall back to the
  // legacy `Cash CHF` label for older holdings snapshots.
  const brokerCash = get('Broker account cash CHF', '');
  const legacyCash = get('Cash CHF', '');
  const portfolioCash = get('Portfolio cash CHF', '');
  const cash = brokerCash || legacyCash || portfolioCash || '0';
  return {
    totalValue: get('Total value CHF'),
    cash,
    invested: get('Invested value CHF'),
    syncTime: get('Date/time'),
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

function formatAllocationRows(rows) {
  if (!rows.length) return '| <asset class> | 0 | 0 | 0 | blocked | no | review missing allocation data |';
  return rows.map((row) => {
    const actionNeeded = row.status === 'out_of_bounds' ? 'yes' : row.status === 'drifted' ? 'watch' : 'no';
    return `| ${row.assetClass} | ${row.current} | ${row.target} | ${row.drift} | ${row.status} | ${actionNeeded} | ${row.status === 'out_of_bounds' ? 'outside min/max band' : row.status === 'drifted' ? 'drift threshold breached' : 'within tolerance'} |`;
  }).join('\n');
}

function proposalSummary(latestProposals = [], totalValue = 0) {
  const plannedCashSleeve = latestProposals
    .filter((proposal) => proposal.tickerOrIsin === 'CASH-CHF' || proposal.action === 'hold')
    .reduce((sum, proposal) => sum + Number(proposal.estimatedChf || 0), 0);

  const plannedBuys = latestProposals
    .filter((proposal) => proposal.action === 'buy')
    .reduce((sum, proposal) => sum + Number(proposal.estimatedChf || 0), 0);

  const executableBuys = latestProposals
    .filter((proposal) => proposal.action === 'buy')
    .reduce((sum, proposal) => sum + Number(proposal.estimatedChf || proposal.amount || 0), 0);

  const residualTradableCash = Number((totalValue - plannedCashSleeve - executableBuys).toFixed(2));
  return {
    plannedCashSleeve,
    plannedBuys,
    executableBuys,
    residualTradableCash: residualTradableCash > 0 ? residualTradableCash : 0,
  };
}

function queueSeverityFromStatus(status = '') {
  const normalized = String(status || '').trim().toLowerCase();
  if (['failed', 'rejected', 'cancelled'].includes(normalized)) return 'warning';
  if (['submitted', 'partially_filled', 'staged', 'approved'].includes(normalized)) return 'attention';
  if (['proposed', 'planned'].includes(normalized)) return 'review';
  return 'info';
}

function formatInstrumentActionRows(approvedInstruments = [], latestProposals = [], totalValue = 0) {
  if (!approvedInstruments.length) return '| <ticker> | 0 | 0 | review missing approvals | missing approved-instrument list | review portfolio setup |';

  const latestRowsByInstrument = new Map();
  for (const proposal of latestProposals) {
    latestRowsByInstrument.set(proposal.tickerOrIsin, proposal);
  }

  return approvedInstruments.map((instrument) => {
    const proposal = latestRowsByInstrument.get(instrument.tickerOrIsin);
    const plannedValue = Number(proposal?.estimatedChf || 0);
    const plannedPct = totalValue > 0 ? Number(((plannedValue / totalValue) * 100).toFixed(2)) : 0;
    const target = Number(instrument.target || 0);
    const currentPct = proposal ? plannedPct : 0;
    // Value-framed reason
    let reason;
    if (proposal?.reason) {
      reason = String(proposal.reason).split(';')[0].trim();
    } else if (instrument.tickerOrIsin === 'CASH-CHF') {
      reason = 'Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order.';
    } else if (target > 0 && currentPct === 0) {
      reason = `Target is ${target}% — no active buy planned. Cash available for deployment.`;
    } else if (target > 0 && currentPct > 0 && currentPct < target * 0.8) {
      reason = `Current ${currentPct.toFixed(1)}% is below target ${target}% — grow position.`;
    } else if (target > 0 && currentPct >= target) {
      reason = `Position at ${currentPct.toFixed(1)}% matches or exceeds target ${target}% — hold.`;
    } else {
      reason = 'No active proposal';
    }
    const approvalNeeded = proposal ? (proposal.approval || 'review') : 'watch';
    // Value-framed suggested action
    let suggestedAction;
    if (proposal) {
      suggestedAction = `${proposal.status}: ${proposal.action}`;
    } else if (instrument.tickerOrIsin === 'CASH-CHF') {
      suggestedAction = 'planned: hold';
    } else if (target > 0 && currentPct === 0) {
      suggestedAction = 'deploy';
    } else if (target > 0 && currentPct > 0 && currentPct < target * 0.8) {
      suggestedAction = 'grow';
    } else {
      suggestedAction = 'watch';
    }
    return `| ${instrument.tickerOrIsin} | ${plannedPct} | ${target} | ${suggestedAction} | ${reason} | ${approvalNeeded} |`;
  }).join('\n');
}

function recommendedActions(existingTrades = [], latestProposals = [], totalValue = 0, brokerReadiness = null, lifecycleSummary = null, allocations = []) {
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
      'Generate initial deployment proposals from the current cash balance.',
      'Refresh history snapshots after holdings updates and trade execution.',
    ];
  }

  const hasCashHold = existingTrades.some((trade) => trade.instrument === 'CHF cash balance' || trade.action === 'hold');
  const summary = proposalSummary(latestProposals, totalValue);
  const hasLiveExecutionHistory = Number(lifecycleSummary?.filled || 0) > 0 || Number(lifecycleSummary?.cancelled || 0) > 0 || Number(lifecycleSummary?.failed || 0) > 0;
  if (hasLiveExecutionHistory && Number(lifecycleSummary?.proposed || 0) === 0 && Number(lifecycleSummary?.approved || 0) === 0) {
    const allOnTrack = allocations.every((row) => row.status === 'on_track');
    if (allOnTrack && Number(summary.residualTradableCash || 0) > 0) {
      return [
        'Portfolio is on track — consider deploying available cash into underweight positions.',
        hasCashHold
          ? 'Keep the defensive CHF cash sleeve near policy and deploy any residual cash when underweight positions have room to grow.'
          : 'All positions are sized and performing as intended; hold and review after the next market session.',
      ];
    }
    return [
      'Portfolio is performing as intended. Hold current positions and review after the next market session.',
      hasCashHold
        ? 'Keep the defensive CHF cash sleeve near policy; only add to positions when a deliberate growth reason exists.'
        : 'Continue normal monitoring and refresh the portfolio workflow after the next material state change.',
    ];
  }
  return [
    'Review and approve the current proposal set before creating overlapping execution plans.',
    hasCashHold
      ? `Keep the defensive sleeve in CHF cash for now, leaving residual tradable cash of CHF ${summary.residualTradableCash} available for the next deployment opportunity.`
      : 'Refresh history snapshots after holdings updates and trade execution.',
  ];
}

function readBlockedTradeQueueItems(tradesPath) {
  if (!tradesPath || !fs.existsSync(tradesPath)) return [];
  const { rows } = readTradesTable(tradesPath);
  const latestBlockedByInstrumentAction = new Map();
  const latestLifecycleByInstrumentAction = new Map();
  const now = Date.now();
  const STALE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const RESOLVED_STATUSES = new Set(['filled', 'cancelled', 'rejected', 'failed', 'inactive']);

  for (const row of rows) {
    const instrument = String(row['Ticker / ISIN'] || '').trim();
    const action = String(row.Action || '').trim().toLowerCase();
    const key = `${instrument}::${action}`;
    latestLifecycleByInstrumentAction.set(key, row);

    const blockCode = String(row['Block code'] || '').trim();
    if (!blockCode) continue;
    const dateStr = String(row['Date/time'] || row['Date'] || '').trim();
    if (dateStr) {
      const ts = new Date(dateStr).getTime();
      if (Number.isFinite(ts) && (now - ts) > STALE_AGE_MS) continue;
    }
    latestBlockedByInstrumentAction.set(key, row);
  }

  return Array.from(latestBlockedByInstrumentAction.entries())
    .filter(([key, blockedRow]) => {
      const latestRow = latestLifecycleByInstrumentAction.get(key);
      if (!latestRow) return true;
      if (latestRow === blockedRow) return true;
      const latestStatus = String(latestRow.Status || latestRow.status || '').trim().toLowerCase();
      return !RESOLVED_STATUSES.has(latestStatus);
    })
    .map(([, row]) => ({
      queueType: 'execution_block',
      severity: 'high',
      status: 'blocked',
      summary: row['Block reason']
        ? `${row['Ticker / ISIN'] || 'Trade row'}: ${row['Block reason']}`
        : `${row['Ticker / ISIN'] || 'Trade row'} is blocked (${row['Block code']}).`,
      blockCode: String(row['Block code'] || '').trim(),
      recommendedOperatorAction: String(row['Next action'] || '').trim() || 'Review the broker-derived block and resolve it before retrying.',
    }));
}

function buildPendingOperatorActions({ tradesPath = null, holdingsText = '', deliveryStatus = null, brokerReadiness = null, brokerErrorState = null, lifecycleSummary = null, openRunnerRetryState = null, safetyDiagnostics = null, fillNotificationState = null, contractIntelligence = null, recommended = [] }) {
  const actions = [];
  const unnotifiedFillCount = Number(fillNotificationState?.reconciledUnnotifiedFills?.length || 0);
  for (const item of deliveryStatus?.pendingActions || []) {
    const normalized = String(item || '');
    if (unnotifiedFillCount > 0 && /notification backfill review/i.test(normalized)) continue;
    actions.push({ queueType: 'delivery', severity: 'medium', status: 'pending', summary: normalized });
  }
  if (brokerReadiness?.fallbackRequired) {
    actions.push({ queueType: 'recovery', severity: 'high', status: 'degraded', summary: `Broker connectivity recovery: ${brokerReadiness.message}` });
  }
  if (brokerErrorState?.stopAutomation) {
    actions.push({ queueType: 'recovery', severity: 'high', status: 'paused', summary: `Broker automation paused after ${brokerErrorState.consecutive} consecutive errors; investigate before resuming.` });
  }
  const inFlightCount = Number(lifecycleSummary?.staged || 0) + Number(lifecycleSummary?.submitted || 0) + Number(lifecycleSummary?.partiallyFilled || 0);
  actions.push(...readBlockedTradeQueueItems(tradesPath).filter((item) => {
    if (item.blockCode !== 'contract_resolution_failed') return true;
    return inFlightCount > 0;
  }));
  const queuedInitial = Number(openRunnerRetryState?.queuedInitial || 0);
  const queuedRetry = Number(openRunnerRetryState?.queuedRetry || 0);
  if (queuedInitial > 0) {
    actions.push({ queueType: 'open_runner_queue', severity: 'medium', status: 'ready_for_review', summary: `${queuedInitial} trade row(s) are queued for a first market-open handoff.` });
  }
  if (queuedRetry > 0) {
    actions.push({ queueType: 'open_runner_retry', severity: 'medium', status: 'ready_for_review', summary: `${queuedRetry} trade row(s) were requeued for market-open retry after operator recovery.` });
  }
  const staleNeedsReapproval = Number(lifecycleSummary?.staleNeedsReapproval || 0);
  const approvedReady = Math.max(0, Number(lifecycleSummary?.approved || 0) - staleNeedsReapproval);
  if (staleNeedsReapproval > 0) {
    actions.push({ queueType: 'approval', severity: 'high', status: 'stale_needs_reapproval', summary: `${staleNeedsReapproval} approved trade row(s) need fresh approval before live submission.` });
  }
  if (approvedReady > 0) {
    actions.push({ queueType: 'approval', severity: 'medium', status: 'ready_for_review', summary: `There are ${approvedReady} executable approved trade row(s) ready for staging/review.` });
  }
  if ((lifecycleSummary?.proposed || 0) > 0) {
    actions.push({ queueType: 'approval', severity: 'medium', status: 'pending_user_approval', summary: `There are ${lifecycleSummary.proposed} proposed trade row(s) awaiting approval.` });
  }
  if ((lifecycleSummary?.submitted || 0) > 0 || (lifecycleSummary?.partiallyFilled || 0) > 0 || (lifecycleSummary?.staged || 0) > 0) {
    const inflight = (lifecycleSummary?.submitted || 0) + (lifecycleSummary?.partiallyFilled || 0) + (lifecycleSummary?.staged || 0);
    actions.push({ queueType: 'execution', severity: 'medium', status: 'in_flight', summary: `Reconcile ${inflight} in-flight broker order(s) before creating overlapping plans.` });
  }
  if (safetyDiagnostics?.holdingsHealth?.stalePricing) {
    actions.push({ queueType: 'data', severity: 'high', status: 'stale', summary: 'Refresh holdings or pricing because safety diagnostics currently mark pricing as stale.' });
  }
  actions.push(...buildContractIntelligenceQueueItems(contractIntelligence));
  if (unnotifiedFillCount > 0) {
    actions.push({ queueType: 'delivery', severity: 'medium', status: 'backfill_review', summary: `${unnotifiedFillCount} reconciled fill(s) were detected after the live window and still need notification backfill review.` });
  }
  if (!actions.length && recommended[0]) actions.push({ queueType: 'workflow', severity: 'low', status: 'recommended', summary: recommended[0] });

  const deduped = [];
  const seen = new Set();
  for (const action of actions) {
    const key = `${action.queueType}::${action.status}::${action.summary}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(action);
  }

  const severityRank = { high: 0, medium: 1, low: 2 };
  const statusRank = { blocked: 0, degraded: 1, paused: 2, failed: 3, pending_user_approval: 4, ready_for_review: 5, in_flight: 6, pending: 7, stale: 8, warning: 9, recommended: 10 };
  return deduped.sort((a, b) => (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99) || (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99) || a.summary.localeCompare(b.summary));
}

function formatPendingQueueRows(items = []) {
  if (!items.length) return '1. [workflow/recommended] No pending operator actions.';
  return items.map((item, index) => `${index + 1}. [${item.queueType}/${item.status}/${item.severity}] ${item.summary}`).join('\n');
}

function formatQueueSummary(summary = {}) {
  return [
    `- Total queue items: ${summary.total || 0}`,
    `- Blocking items: ${summary.blocking || 0}`,
    `- Approval items: ${summary.approvals || 0}`,
    `- Fresh actionable approvals: ${summary.freshApprovals || 0}`,
    `- Stale approvals needing reapproval: ${summary.staleApprovals || 0}`,
    `- Execution items: ${summary.execution || 0}`,
    `- Open-runner first handoffs: ${summary.openRunnerQueue || 0}`,
    `- Open-runner retries: ${summary.openRunnerRetry || 0}`,
    `- Recovery items: ${summary.recovery || 0}`,
    `- Delivery items: ${summary.delivery || 0}`,
    `- Data items: ${summary.data || 0}`,
    `- Warning items: ${summary.warnings || 0}`,
    `- Workflow items: ${summary.workflow || 0}`,
  ].join('\n');
}

function buildContractIntelligenceQueueItems(contractIntelligence = {}) {
  const normalized = contractIntelligence && typeof contractIntelligence === 'object' ? contractIntelligence : {};
  const actions = [];
  const examples = normalized.examples || {};
  if ((normalized.missingConidCount || 0) > 0) {
    actions.push({
      queueType: 'data',
      severity: 'medium',
      status: 'contract_identity_gap',
      summary: `${normalized.missingConidCount} approved instrument(s) are missing IBKR conids.${examples.missingConid?.[0] ? ` Example: ${examples.missingConid[0].tickerOrIsin}.` : ''}`,
      recommendedOperatorAction: 'Resolve missing conids before relying on the full approved set for execution readiness.',
    });
  }
  if ((normalized.missingSymbolCount || 0) > 0) {
    actions.push({
      queueType: 'data',
      severity: 'medium',
      status: 'contract_identity_gap',
      summary: `${normalized.missingSymbolCount} approved instrument(s) are missing IBKR symbols.${examples.missingSymbol?.[0] ? ` Example: ${examples.missingSymbol[0].tickerOrIsin}.` : ''}`,
      recommendedOperatorAction: 'Fill missing IBKR symbols so native contract resolution stays deterministic.',
    });
  }
  if ((normalized.missingVenueCount || 0) > 0) {
    actions.push({
      queueType: 'data',
      severity: 'low',
      status: 'contract_identity_gap',
      summary: `${normalized.missingVenueCount} approved instrument(s) are missing venue identity.${examples.missingVenue?.[0] ? ` Example: ${examples.missingVenue[0].tickerOrIsin}.` : ''}`,
      recommendedOperatorAction: 'Add exchange / venue identity so operators can verify the intended execution venue.',
    });
  }
  return actions;
}

function buildMaterialEvents(events = []) {
  if (!events.length) {
    return [{
      time: 'n/a',
      eventType: 'none',
      severity: 'info',
      summary: 'No recent runtime events recorded.',
      nextStep: 'Continue normal monitoring.',
    }];
  }

  return events.slice(-5).reverse().map((event) => ({
    time: String(event.timestamp || 'n/a').replace('T', ' ').replace('Z', ' UTC'),
    eventType: event.action || event.category || 'event',
    severity: event.level || 'info',
    summary: event.summary || 'Observed runtime event.',
    nextStep: String(event.status || '').toLowerCase().includes('blocked')
      ? 'Resolve the blocking condition before proceeding.'
      : String(event.level || '').toLowerCase() === 'warn'
        ? 'Review details and confirm no operator action is required.'
        : 'No immediate action required.',
  }));
}

function formatMaterialEventRows(events = []) {
  return events.map((event) => `| ${event.time} | ${event.eventType} | ${event.severity} | ${event.summary} | ${event.nextStep} |`).join('\n');
}

function formatRecommendedStep(step) {
  if (step == null) return '';
  if (typeof step === 'string') return step;
  if (typeof step === 'object' && step.summary) return String(step.summary);
  return String(step);
}

function bestNextStep({ pendingActions = [], blockers = [], recommendedActionsList = [], brokerReadiness = null, lifecycleSummary = null }) {
  if (blockers.length > 0) return `Resolve the active blocker: ${blockers[0].message || blockers[0]}`;
  if (pendingActions.length > 0) {
    const recommendationPriority = {
      'execution_block::blocked': 0,
      'recovery::paused': 1,
      'recovery::degraded': 2,
      'approval::stale_needs_reapproval': 3,
      'execution::in_flight': 4,
      'approval::pending_user_approval': 5,
      'approval::ready_for_review': 6,
      'open_runner_retry::ready_for_review': 7,
      'open_runner_queue::ready_for_review': 8,
      'delivery::backfill_review': 9,
      'backfill_review::backfill_review': 9,
      'delivery::backfill_review::backfill_review': 9,
      'backfill_review::delivery::backfill_review': 9,
      'delivery::pending': 10,
      'data::stale': 11,
      'workflow::recommended': 11,
    };
    const prioritized = [...pendingActions].sort((a, b) => {
      const aQueue = a.queueType || 'unknown';
      const aKind = a.kind || 'unknown';
      const bQueue = b.queueType || 'unknown';
      const bKind = b.kind || 'unknown';
      const aKeys = [
        `${aQueue}::${a.status}`,
        `${aKind}::${a.status}`,
        `${aKind}::${aQueue}::${a.status}`,
        `${aQueue}::${aKind}::${a.status}`,
      ];
      const bKeys = [
        `${bQueue}::${b.status}`,
        `${bKind}::${b.status}`,
        `${bKind}::${bQueue}::${b.status}`,
        `${bQueue}::${bKind}::${b.status}`,
      ];
      const aRank = Math.min(...aKeys.map((key) => recommendationPriority[key] ?? 99));
      const bRank = Math.min(...bKeys.map((key) => recommendationPriority[key] ?? 99));
      return aRank - bRank || String(a.summary || '').localeCompare(String(b.summary || ''));
    });
    return prioritized[0];
  }
  if ((lifecycleSummary?.approved || 0) > 0) return 'Review and stage approved trades once broker readiness is healthy.';
  if (brokerReadiness?.fallbackRequired) return 'Restore Interactive Brokers readiness, then refresh broker-backed proposals.';
  return recommendedActionsList[0] || 'Continue normal monitoring and refresh the portfolio workflow after the next material state change.';
}

function formatExecutionPlan(plan = { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } }) {
  if (!plan.rows.length) return '- No draft execution plan yet.';
  const lines = plan.rows.map((row) => `- ${row.tickerOrIsin}: target ${row.targetPct}% | intended CHF ${row.intendedChf} | executable CHF ${row.executableChf} | gap CHF ${row.executionGapChf}`);
  lines.push(`- Totals: intended CHF ${plan.totals.intendedChf} | executable CHF ${plan.totals.executableChf} | gap CHF ${plan.totals.executionGapChf}`);
  return lines.join('\n');
}

function formatExecutionLifecycle(summary = {}) {
  return [
    `- Proposed: ${summary.proposed || 0}`,
    `- Approved: ${summary.approved || 0}`,
    `- Rejected: ${summary.rejected || 0}`,
    `- Staged: ${summary.staged || 0}`,
    `- Submitted: ${summary.submitted || 0}`,
    `- Partially filled: ${summary.partiallyFilled || 0}`,
    `- Filled: ${summary.filled || 0}`,
    `- Cancelled: ${summary.cancelled || 0}`,
    `- Failed: ${summary.failed || 0}`,
    `- Planned-only entries: ${summary.planned || 0}`,
    `- Rows with broker order id: ${summary.withBrokerOrderId || 0}`,
  ].join('\n');
}

function formatObservabilityStatus(observability = {}) {
  const normalized = observability || {};
  const recent = normalized.recentSummary || {};
  return [
    `- Runtime event file present: ${normalized.eventsPathPresent ? 'yes' : 'no'}`,
    `- Recent runtime events scanned: ${recent.total || 0}`,
    `- Recent blocked trade events: ${recent.blockedTrades || 0}`,
    `- Open-runner first handoff events: ${recent.openRunnerQueueEvents || 0}`,
    `- Open-runner retry events: ${recent.openRunnerRetryEvents || 0}`,
    `- Recent degraded broker events: ${recent.degradedBrokerEvents || 0}`,
    `- Recent stale-data events: ${recent.staleDataEvents || 0}`,
  ].join('\n');
}

function formatBlockerLines(blockers = []) {
  if (!blockers.length) return '- none';
  return blockers.map((item) => `- ${item.severity || 'info'}: ${item.message || item}`).join('\n');
}

function fmtChf(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  const sign = n >= 0 ? '' : '-';
  return `${sign}${Math.abs(n).toLocaleString('en-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function formatProfitLossRows(rows = []) {
  if (!rows.length) return '| — | — | — | — | — | — |';
  return rows.map((row) => {
    const name = row.name || row.symbol || row.tickerOrIsin || '?';
    const value = fmtChf(row.valueChf);
    const cost = row.costBasisChf == null ? '— (no cost basis yet)' : fmtChf(row.costBasisChf);
    const profit = row.unrealizedProfitChf == null ? '—' : fmtChf(row.unrealizedProfitChf);
    const profitPct = row.unrealizedProfitPct == null ? '—' : fmtPct(row.unrealizedProfitPct);
    const sourceLabel = row.costBasisSource === 'trades_md'
      ? 'trades.md'
      : row.costBasisSource === 'ibkr_avg_cost'
        ? 'IBKR avg cost'
        : 'none';
    return `| ${name} | ${value} | ${cost} | ${profit} | ${profitPct} | ${sourceLabel} |`;
  }).join('\n');
}

async function generateDashboard({ portfolioName, tradesPath = '', holdingsText, allocations = [], approvedInstruments = [], existingTrades = [], latestProposals = [], executionPlan = { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } }, latestSnapshot = null, brokerReadiness = null, lifecycleSummary = null, openRunnerRetryState = null, freshness = null, brokerErrorState = null, deliveryStatus = null, observability = null, safetyDiagnostics = null, fillNotificationState = null, recentEvents = [], contractIntelligence = null }) {
  const summary = parseHoldingsSummary(holdingsText);
  const holdingCount = countHoldingRows(holdingsText);
  const totalValue = Number(summary.totalValue || 0);
  // Cost-basis enrichment for the Profit / Loss section.
  const tradesTextForCostBasis = tradesPath && fs.existsSync(tradesPath) ? fs.readFileSync(tradesPath, 'utf8') : '';
  // Load avg-cost sidecar for cost-basis enrichment (written by holdings sync)
  const portfolioDirForSidecar = tradesPath ? path.dirname(tradesPath) : null;
  const avgCostSidecarPath = portfolioDirForSidecar ? path.join(portfolioDirForSidecar, 'holdings-avg-cost.json') : null;
  const avgCostByKey = avgCostSidecarPath && fs.existsSync(avgCostSidecarPath)
    ? (() => { try { return JSON.parse(fs.readFileSync(avgCostSidecarPath, 'utf8')); } catch { return null; } })()
    : null;
  const resolvedQuotes = await resolveHoldingQuotes({
    holdingRows: parseHoldingsTable(holdingsText),
    approvedInstruments,
    portfolio: portfolioName,
    brokerReadiness,
  });
  const profitLoss = buildProfitLossSummary({
    holdingRows: resolvedQuotes.rows.map((row) => ({ ...row, valueChf: row.resolvedValueChf ?? row.valueChf })),
    tradesText: tradesTextForCostBasis,
    approvedInstruments,
    avgCostByKey,
  });

  // Compact holdings table sorted by value (CHF) descending
  const holdingsRows = profitLoss.rows.slice().sort((a, b) => (b.valueChf ?? 0) - (a.valueChf ?? 0));
  const holdingsTable = holdingsRows.length
    ? `| Instrument | Value CHF | P/L CHF | P/L % | Weight % |
|---|---:|---:|---:|---:|
${holdingsRows.map((r) => {
      const name = r.name || r.symbol || r.tickerOrIsin || '?';
      const value = fmtChf(r.valueChf);
      const plChf = r.unrealizedProfitChf == null ? '—' : `${r.unrealizedProfitChf >= 0 ? '+' : ''}${fmtChf(r.unrealizedProfitChf)}`;
      const plPct = r.unrealizedProfitPct == null ? '—' : fmtPct(r.unrealizedProfitPct);
      const wt = totalValue > 0 ? ((r.valueChf ?? 0) / totalValue * 100).toFixed(1) + '%' : '—';
      return `| ${name} | ${value} | ${plChf} | ${plPct} | ${wt} |`;
    }).join('\n')}`
    : '| — | — | — | — | — |';

  const tradeRows = existingTrades.length
    ? existingTrades.map((t) => `| ${t.date} | ${t.action} | ${t.instrument} | ${t.estimatedChf || t.amount} | ${t.status} |`).join('\n')
    : '| YYYY-MM-DD | <action> | <instrument> | 0 | none |';

  const blockers = safetyDiagnostics?.blockers || [];
  const warnings = [
    '- Dashboard regeneration currently computes allocation drift at the asset-class level only.',
  ];
  const proposalTotals = proposalSummary(latestProposals, totalValue);
  if (proposalTotals.residualTradableCash > 0) {
    warnings.push(`- Whole-share draft sizing leaves CHF ${proposalTotals.residualTradableCash} unallocated beyond the intentional CHF cash sleeve.`);
  }
  if (brokerReadiness?.fallbackRequired) warnings.push(`- ${brokerReadiness.message}`);
  if (brokerErrorState?.stopAutomation) warnings.push(`- Broker automation is paused after ${brokerErrorState.consecutive} consecutive broker errors (${brokerErrorState.lastReason || 'unknown reason'}).`);
  if ((lifecycleSummary?.failed || 0) > 0) warnings.push(`- ${lifecycleSummary.failed} actionable trade row(s) are currently marked failed and may need manual review.`);
  if ((lifecycleSummary?.rejected || 0) > 0) warnings.push(`- ${lifecycleSummary.rejected} trade log row(s) were explicitly rejected by an operator.`);
  if ((lifecycleSummary?.submitted || 0) > 0 || (lifecycleSummary?.partiallyFilled || 0) > 0) warnings.push('- There are in-flight broker order states; avoid overlapping execution plans until reconciliation is current.');
  if (freshness?.stale) warnings.push(`- Dashboard freshness warning: source state changed after the dashboard was last written (${freshness.newestSourcePath || 'unknown source'}).`);
  if (latestSnapshot?.notes) warnings.push(`- Latest history note: ${latestSnapshot.notes}`);
  if ((fillNotificationState?.reconciledUnnotifiedFills?.length || 0) > 0) warnings.push(`- ${fillNotificationState.reconciledUnnotifiedFills.length} reconciled fill(s) were detected without a confirmed sent notification; review notification backfill state.`);
  if ((observability?.recentSummary?.blockedTrades || 0) > 0) warnings.push(`- Observability shows ${observability.recentSummary.blockedTrades} recent blocked execution-policy event(s).`);
  if (safetyDiagnostics?.diagnostics?.holdingsHealth?.stalePricing || safetyDiagnostics?.holdingsHealth?.stalePricing) warnings.push('- Safety diagnostics currently mark holdings pricing as stale.');

  const strategy = strategyStatus(allocations, brokerReadiness, blockers);
  const recommended = recommendedActions(existingTrades, latestProposals, totalValue, brokerReadiness, lifecycleSummary, allocations);
  const contractIdentity = contractIntelligence || summarizeContractIntelligence(approvedInstruments);
  const pendingActions = buildPendingOperatorActions({
    tradesPath,
    holdingsText,
    deliveryStatus,
    brokerReadiness,
    brokerErrorState,
    lifecycleSummary,
    openRunnerRetryState,
    safetyDiagnostics: safetyDiagnostics?.diagnostics || safetyDiagnostics,
    fillNotificationState,
    contractIntelligence: contractIdentity,
    recommended,
  });
  const materialEvents = buildMaterialEvents(recentEvents);
  const operatorQueueSummary = summarizeOperatorQueue(pendingActions.map((item) => ({ ...item, kind: item.queueType === 'recovery' ? 'broker' : item.queueType })));
  const portfolioHealth = healthLabel({
    brokerReadiness,
    brokerErrorState,
    freshness,
    blockers,
    lifecycleSummary,
    pendingActions: pendingActions.map((item) => item.summary),
  });
  const recommendation = formatRecommendedStep(bestNextStep({
    pendingActions,
    blockers,
    recommendedActionsList: recommended,
    brokerReadiness,
    lifecycleSummary,
  }));
  const topBlocker = (brokerReadiness?.fallbackRequired ? brokerReadiness?.message : null) || blockers[0]?.message || null;
  const topOperatorAction = brokerReadiness?.fallbackRequired
    ? (brokerReadiness?.guidance || brokerReadiness?.message || recommendation)
    : (recommendation || recommended[0] || 'Continue normal monitoring and wait for the next material state change.');
  const pendingApprovalCount = (lifecycleSummary?.proposed || 0) + (lifecycleSummary?.approved || 0);
  const inFlightCount = (lifecycleSummary?.staged || 0) + (lifecycleSummary?.submitted || 0) + (lifecycleSummary?.partiallyFilled || 0);
  const latestDate = latestSnapshot?.date || summary.syncTime || 'unknown';
  const deliveryLines = [
    `- Weekly report: ${deliveryStatus?.latestHistoryDate ? `latest history ${deliveryStatus.latestHistoryDate}` : 'unknown'}`,
    `- Monthly report: ${deliveryStatus?.deliveryMode || 'unknown'}`,
    `- Quarterly report: ${deliveryStatus?.failureAlertMode || 'unknown'}`,
    `- Delivery readiness: ${deliveryStatus?.ready ? 'ready' : 'needs_operator_attention'}`,
    `- Failure alert readiness: ${deliveryStatus?.failureAlertMode || 'unknown'}`,
    `- Notified fills: ${fillNotificationState?.notifiedFills?.length || 0}`,
    `- Reconciled fills pending notification backfill: ${fillNotificationState?.reconciledUnnotifiedFills?.length || 0}`,
    `- Acknowledged backfilled fills: ${fillNotificationState?.acknowledgedBackfilledFills?.length || 0}`,
  ].join('\n');
  const pendingActionRows = formatPendingQueueRows(pendingActions);

  return [
    `# Dashboard: ${portfolioName}
`,
    `## Portfolio Value Snapshot
`,
    `- Total value CHF: ${summary.totalValue}
`,
    `- Cash CHF: ${summary.cash}
`,
    `- Invested CHF: ${summary.invested}
`,
    `- Daily move CHF: ${latestSnapshot?.dailyChange || '0'}
`,
    `- Daily move %: ${latestSnapshot?.dailyChangePct || '0'}
`,
    `- Since last report CHF: ${latestSnapshot?.dailyChange || '0'}
`,
    `- Since last report %: ${latestSnapshot?.dailyChangePct || '0'}
`,
    `- Number of holdings: ${holdingCount}
`,
    `- Latest snapshot date: ${latestDate}
`,
    `- Total unrealized profit CHF: ${profitLoss.totals.totalProfitChf}
`,
    `- Total unrealized profit %: ${profitLoss.totals.totalProfitPct == null ? 'unknown (no cost-basis coverage yet)' : profitLoss.totals.totalProfitPct}
`,
    `- Cost-basis coverage: ${profitLoss.totals.coveredCount}/${profitLoss.rows.length} holdings (CHF ${profitLoss.totals.coveredValueChf} of position value)
`,
    `
## Profit / Loss
`,
    `- Total unrealized profit CHF: ${profitLoss.totals.totalProfitChf}
`,
    `- Total cost basis CHF (covered holdings only): ${profitLoss.totals.totalCostBasisChf}
`,
    `- Total unrealized profit %: ${profitLoss.totals.totalProfitPct == null ? 'unknown' : profitLoss.totals.totalProfitPct + '%'}
`,
    `- Cost-basis source priority: trades.md filled buys, then IBKR avg cost fallback. Holdings without cost-basis history show —.
`,
    `
| Instrument | Value CHF | Cost basis CHF | Profit CHF | Profit % | Cost basis source |
|---|---:|---:|---:|---:|---|
${formatProfitLossRows(profitLoss.rows)}
`,
    `## Holdings
`,
    `Holdings sorted by CHF value (descending).
`,
    `
${holdingsTable}
`,
    `## Instrument Actions Queue
`,
    `Value-framed: actions are framed as deploy, grow, or hold — not fix drift.
`,
    `
| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
${formatInstrumentActionRows(approvedInstruments, latestProposals, totalValue)}
`,
    `## Balance Check
`,
    `Allocation drift is tracked as a constraint; see below. All sleeves within target bands is the goal.
`,
    `
| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
${formatAllocationRows(allocations)}
`,
    `## Pending Operator Actions
`,
    `${pendingActionRows}
`,
    `## Immediate Status
`,
    `- Portfolio status: ${portfolioHealth}
`,
    `- Top blocker: ${topBlocker || 'none currently surfaced'}
`,
    `- Next action: ${topOperatorAction}
`,
    `- Broker health: ${brokerReadiness?.message || 'unknown'}
`,
    `- Execution posture: ${brokerErrorState?.stopAutomation ? 'paused' : (brokerReadiness?.fallbackRequired ? 'degraded_dry_run_only' : 'ready_for_review')}
`,
    `- Delivery posture: ${deliveryStatus?.ready ? 'ready' : 'needs_operator_attention'}
`,
    `- Active blockers: ${blockers.length}
`,
    `- Pending operator queue items: ${pendingActions.length}
`,
    `## Health Snapshot
`,
    `- Strategy status: ${strategy}
`,
    `- Last successful sync: ${summary.syncTime}
`,
    `- Data freshness: ${freshness?.stale ? 'stale' : 'current'}
`,
    `- Pending approvals: ${pendingApprovalCount}
`,
    `- In-flight execution rows: ${inFlightCount}
`,
    `## Safety / Risk Diagnostics
`,
    `- Safety status: ${blockers.length ? 'blocked_or_warning' : 'clear'}
`,
    `- Risk-limit warnings: ${blockers.filter((item) => item.severity === 'warning').length}
`,
    `- Broker/API warnings: ${brokerReadiness?.fallbackRequired ? 1 : 0}
`,
    `- Stale data warnings: ${(freshness?.stale || (safetyDiagnostics?.diagnostics?.holdingsHealth?.stalePricing || safetyDiagnostics?.holdingsHealth?.stalePricing)) ? 1 : 0}
`,
    `- Execution pause state: ${brokerErrorState?.stopAutomation ? 'paused' : 'active'}
`,
    `- Active blocker detail:
${formatBlockerLines(blockers)}
`,
    `## Contract Intelligence Readiness
`,
    `- ${contractIdentity.summaryLine}
`,
    `- Recommended contract-intelligence action: ${contractIdentity.nextAction}
`,
    `## Operator Queue Summary
${formatQueueSummary(operatorQueueSummary)}
`,
    `## Recent Material Events
`,
    `| Time | Event type | Severity | Summary | Next step |
|---|---|---|---|---|
${formatMaterialEventRows(materialEvents)}
`,
    `## Report / Delivery Status
${deliveryLines}
`,
    `## Recommended Next Step
${recommendation}
`,
    `## Status Labels
`,
    `- Pending approvals queue count: ${pendingApprovalCount}
`,
    `- In-flight execution rows: ${inFlightCount}
`,
    `- Latest action recommendations:
  - ${recommended[0]}
  - ${recommended[1]}
`,
    `## Risk Warnings\n${warnings.join('\n')}\n`,
    `## Observability Status
${formatObservabilityStatus(observability)}
`,
    `## Execution Lifecycle
${formatExecutionLifecycle(lifecycleSummary)}
`,
    `## Execution Plan
${formatExecutionPlan(executionPlan)}
`,
    `## Recent Trades
`,
    `| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
${tradeRows}
`,
  ].join('');
}

async function regenerateDashboard(portfolioDir) {
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
  const fillNotificationState = loadFillNotificationState(path.resolve(__dirname, '..', '..'));
  const openRunnerRetryState = summarizeOpenRunnerRetryState(tradesPath);
  let freshness = fileFreshnessSummary({ dashboardPath, sourcePaths });
  let deliveryStatus = reportDeliveryStatus({ portfolioDir });
  let dashboard = await generateDashboard({
    portfolioName,
    tradesPath,
    holdingsText,
    allocations,
    approvedInstruments,
    existingTrades: recentTrades(tradesPath),
    contractIntelligence,
    latestProposals,
    executionPlan: buildExecutionPlan({ portfolioPath, tradesPath, totalValue: Number(parseHoldingsSummary(holdingsText).totalValue || 0) }),
    latestSnapshot: latestHistory(historyPath),
    brokerReadiness,
    lifecycleSummary: executionLifecycleSummary(tradesPath, { actionableOnly: true }),
    openRunnerRetryState,
    freshness,
    brokerErrorState: currentBrokerErrorState,
    deliveryStatus,
    observability,
    safetyDiagnostics: safetyEvaluation,
    fillNotificationState,
    recentEvents,
  });
  writeTextIfChanged(dashboardPath, dashboard);
  freshness = fileFreshnessSummary({ dashboardPath, sourcePaths });
  deliveryStatus = reportDeliveryStatus({ portfolioDir });
  dashboard = await generateDashboard({
    portfolioName,
    tradesPath,
    holdingsText,
    allocations,
    approvedInstruments,
    existingTrades: recentTrades(tradesPath),
    contractIntelligence,
    latestProposals,
    executionPlan: buildExecutionPlan({ portfolioPath, tradesPath, totalValue: Number(parseHoldingsSummary(holdingsText).totalValue || 0) }),
    latestSnapshot: latestHistory(historyPath),
    brokerReadiness,
    lifecycleSummary: executionLifecycleSummary(tradesPath, { actionableOnly: true }),
    openRunnerRetryState,
    freshness,
    brokerErrorState: currentBrokerErrorState,
    deliveryStatus,
    observability,
    safetyDiagnostics: safetyEvaluation,
    fillNotificationState,
    recentEvents,
  });
  writeTextIfChanged(dashboardPath, dashboard);
  return dashboardPath;
}

module.exports = { generateDashboard, regenerateDashboard, formatExecutionLifecycle, fileFreshnessSummary, buildPendingOperatorActions, buildMaterialEvents, bestNextStep, formatRecommendedStep, formatPendingQueueRows, formatQueueSummary, buildContractIntelligenceQueueItems };
