const fs = require('fs');
const path = require('path');
const { recentTrades, latestHistory, executionLifecycleSummary } = require('./portfolioData');
const { getInteractiveBrokersReadiness } = require('../brokers/interactive-brokers/readiness');
const { brokerErrorStatus } = require('../execution/runtimeState');
const { reportDeliveryStatus, reportPendingActions } = require('./deliveryPolicy');
const { fileFreshnessSummary } = require('./freshness');
const { summarizeOperatorQueue } = require('./operatorQueue');

function formatGenerationStatus(generationMeta = {}) {
  const meta = generationMeta || {};
  const lines = [
    `- Markdown written: ${meta.markdownWritten ? 'yes' : 'no'}`,
    `- PDF mode: ${meta.pdfMode || 'unknown'}`,
    `- PDF written: ${meta.pdfPath ? 'yes' : 'no'}`,
    `- HTML fallback written: ${meta.htmlPath ? 'yes' : 'no'}`,
  ];
  if (meta.renderWarning) lines.push(`- Render warning: ${meta.renderWarning}`);
  return lines.join('\n');
}

function formatDeliveryStatus(deliveryStatus = {}) {
  const status = deliveryStatus || {};
  return [
    `- Delivery mode: ${status.deliveryMode || 'unknown'}`,
    `- Intended channels: ${(status.intendedChannels || []).join(', ') || 'unknown'}`,
    `- External delivery enabled: ${status.externalDeliveryEnabled ? 'yes' : 'no'}`,
    `- Failure alert mode: ${status.failureAlertMode || 'unknown'}`,
    `- Failure alert targets: ${(status.failureAlertTargets || []).join(', ') || 'unknown'}`,
    `- Policy override loaded: ${status.overrideLoaded ? 'yes' : 'no'}`,
    `- Delivery readiness: ${status.ready ? 'ready' : 'needs_operator_attention'}`,
  ].join('\n');
}

function formatPendingActions(pendingActions = []) {
  if (!pendingActions.length) return '1. None.';
  return pendingActions.map((item, index) => {
    if (typeof item === 'string') return `${index + 1}. ${item}`;
    return `${index + 1}. [${item.queueType || 'workflow'}/${item.status || 'pending'}/${item.severity || 'low'}] ${item.summary}`;
  }).join('\n');
}

function formatOperatorQueueSummary(summary = {}) {
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

function formatRuntimeEventSummary(summary = {}) {
  return [
    `- Runtime events scanned: ${summary.total || 0}`,
    `- Blocked execution-policy events: ${summary.blockedTrades || 0}`,
    `- Open-runner first handoff events: ${summary.openRunnerQueueEvents || 0}`,
    `- Open-runner retry events: ${summary.openRunnerRetryEvents || 0}`,
    `- Degraded broker events: ${summary.degradedBrokerEvents || 0}`,
    `- Stale-data events: ${summary.staleDataEvents || 0}`,
  ].join('\n');
}

function urgencyLabel(level = 'medium') {
  return level === 'critical' ? 'CRITICAL' : level === 'high' ? 'HIGH' : level === 'low' ? 'LOW' : 'MEDIUM';
}

function deriveRecommendationUrgency({ brokerReadiness, lifecycleSummary, queueSummary, executionPlan, freshness, deliveryStatus }) {
  if ((queueSummary?.blocking || 0) > 0 || brokerReadiness?.fallbackRequired || (lifecycleSummary?.failed || 0) > 0) return 'critical';
  if ((lifecycleSummary?.staged || 0) > 0 || (lifecycleSummary?.submitted || 0) > 0 || (lifecycleSummary?.partiallyFilled || 0) > 0) return 'high';
  if (freshness?.stale || deliveryStatus?.ready === false || Number(executionPlan?.totals?.executionGapChf || 0) > 0 || (queueSummary?.approvals || 0) > 0) return 'medium';
  return 'low';
}

function formatUrgentAction(label, text, level) {
  return `- [${urgencyLabel(level)}] ${label}: ${text}`;
}

function buildIncidentSummary({ brokerReadiness, lifecycleSummary, freshness, brokerErrorState, queueSummary }) {
  const incidents = [];
  if ((queueSummary?.blocking || 0) > 0) incidents.push(`Blocking queue items: ${queueSummary.blocking}`);
  if (brokerReadiness?.fallbackRequired) incidents.push(`Broker readiness degraded: ${brokerReadiness.message}`);
  if (brokerErrorState?.stopAutomation) incidents.push(`Broker automation paused after ${brokerErrorState.consecutive || 0} consecutive errors`);
  if ((lifecycleSummary?.failed || 0) > 0) incidents.push(`Failed execution rows: ${lifecycleSummary.failed}`);
  if ((lifecycleSummary?.staged || 0) > 0 || (lifecycleSummary?.submitted || 0) > 0 || (lifecycleSummary?.partiallyFilled || 0) > 0) incidents.push(`In-flight execution rows: ${Number(lifecycleSummary?.staged || 0) + Number(lifecycleSummary?.submitted || 0) + Number(lifecycleSummary?.partiallyFilled || 0)}`);
  if (freshness?.stale) incidents.push('Dashboard/report freshness is stale relative to source state');
  return incidents.length ? incidents.map((item) => `- ${item}`).join('\n') : '- No active incidents or blockers are currently surfaced.';
}

function buildChangeSummary({ latestSnapshot, previousSnapshot = null, lifecycleSummary, previousLifecycleSummary = null, queueSummary, previousQueueSummary = null }) {
  if (!previousSnapshot && !previousLifecycleSummary && !previousQueueSummary) return '- No prior report comparison available yet.';
  const lines = [];
  if (latestSnapshot && previousSnapshot) {
    const valueDelta = Number(latestSnapshot.totalValue || 0) - Number(previousSnapshot.totalValue || 0);
    const cashDelta = Number(latestSnapshot.cash || 0) - Number(previousSnapshot.cash || 0);
    lines.push(`- Portfolio value change since previous report: CHF ${valueDelta.toFixed(2)}`);
    lines.push(`- Cash change since previous report: CHF ${cashDelta.toFixed(2)}`);
  }
  if (lifecycleSummary && previousLifecycleSummary) {
    const proposedDelta = Number(lifecycleSummary.proposed || 0) - Number(previousLifecycleSummary.proposed || 0);
    const approvedDelta = Number(lifecycleSummary.approved || 0) - Number(previousLifecycleSummary.approved || 0);
    const inflightNow = Number(lifecycleSummary.staged || 0) + Number(lifecycleSummary.submitted || 0) + Number(lifecycleSummary.partiallyFilled || 0);
    const inflightPrev = Number(previousLifecycleSummary.staged || 0) + Number(previousLifecycleSummary.submitted || 0) + Number(previousLifecycleSummary.partiallyFilled || 0);
    lines.push(`- Proposed trade delta: ${proposedDelta >= 0 ? '+' : ''}${proposedDelta}`);
    lines.push(`- Approved trade delta: ${approvedDelta >= 0 ? '+' : ''}${approvedDelta}`);
    lines.push(`- In-flight execution delta: ${inflightNow - inflightPrev >= 0 ? '+' : ''}${inflightNow - inflightPrev}`);
  }
  if (queueSummary && previousQueueSummary) {
    const pendingDelta = Number(queueSummary.total || 0) - Number(previousQueueSummary.total || 0);
    const blockingDelta = Number(queueSummary.blocking || 0) - Number(previousQueueSummary.blocking || 0);
    lines.push(`- Queue item delta: ${pendingDelta >= 0 ? '+' : ''}${pendingDelta}`);
    lines.push(`- Blocking item delta: ${blockingDelta >= 0 ? '+' : ''}${blockingDelta}`);
  }
  return lines.length ? lines.join('\n') : '- No material changes since the previous report snapshot.';
}

function loadPreviousReportContext({ portfolioDir, period, currentDateStamp }) {
  const reportsDir = path.join(portfolioDir, 'reports', period);
  if (!fs.existsSync(reportsDir)) return null;
  const candidates = fs.readdirSync(reportsDir)
    .filter((name) => name.endsWith('.md'))
    .filter((name) => !currentDateStamp || !name.includes(`_${currentDateStamp}.md`))
    .sort();
  const latest = candidates[candidates.length - 1];
  if (!latest) return null;
  const text = fs.readFileSync(path.join(reportsDir, latest), 'utf8');
  const escapedLabel = (label) => String(label).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const numberFor = (label) => {
    const match = text.match(new RegExp(`- ${escapedLabel(label)}: ([^\\n]+)`));
    if (!match) return null;
    const numeric = Number(String(match[1]).replace(/[^0-9.+-]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  };
  const cashMatch = text.match(/Latest snapshot: CHF\s+([0-9.+-]+)\s+total and CHF\s+([0-9.+-]+)\s+cash\./i);
  return { file: latest, snapshot: { totalValue: numberFor('End value CHF'), cash: cashMatch ? Number(cashMatch[2]) : null }, lifecycleSummary: { proposed: numberFor('Proposed') || 0, approved: numberFor('Approved') || 0, staged: numberFor('Staged') || 0, submitted: numberFor('Submitted') || 0, partiallyFilled: numberFor('Partially filled') || 0 }, queueSummary: { total: numberFor('Total queue items') || 0, blocking: numberFor('Blocking items') || 0 } };
}

function narrativeSummary({ latestSnapshot, brokerReadiness, lifecycleSummary, freshness, generationMeta, deliveryStatus }) {
  const parts = [];
  if (latestSnapshot) parts.push(`Latest snapshot: CHF ${latestSnapshot.totalValue} total and CHF ${latestSnapshot.cash} cash.`);
  if ((lifecycleSummary?.staged || 0) > 0 || (lifecycleSummary?.submitted || 0) > 0 || (lifecycleSummary?.partiallyFilled || 0) > 0) parts.push('There are in-flight execution states that still need reconciliation attention.');
  else parts.push('No in-flight execution states are currently pending.');
  if (freshness?.stale) parts.push('Dashboard freshness is stale relative to at least one source file.');
  else parts.push('Dashboard freshness is current against the tracked source files.');
  if (brokerReadiness?.fallbackRequired) parts.push(`Broker readiness is degraded: ${brokerReadiness.message}`);
  else parts.push(`Broker readiness is ${brokerReadiness?.message || 'unknown'}.`);
  if (generationMeta?.renderWarning) parts.push(`Rendering required a fallback: ${generationMeta.renderWarning}`);
  if (deliveryStatus?.ready === false) parts.push(`Reporting delivery posture needs operator attention (${(deliveryStatus.pendingActions || []).length} pending item(s)).`);
  else if (deliveryStatus) parts.push('Reporting delivery posture is local-only and currently clear of pending actions.');
  return parts.join(' ');
}

function compactRowText(items = [], limit = 5) {
  return (Array.isArray(items) ? items : []).slice(0, limit).map((item) => {
    if (typeof item === 'string') return item;
    return `${item.queueType || 'workflow'}:${item.status || 'pending'}:${item.severity || 'low'} ${item.summary || ''}`.trim();
  });
}

function formatReport({ portfolioName, period, start = '', end = '', generated = '', trades = [], latestSnapshot = null, executionPlan = { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } }, brokerReadiness = null, lifecycleSummary = null, freshness = null, generationMeta = null, brokerErrorState = null, deliveryStatus = null, pendingActions = [], previousReportContext = null }) {
  const normalizedQueueItems = pendingActions.map((item) => typeof item === 'string' ? { queueType: 'workflow', severity: 'low', status: 'pending', summary: item } : item);
  const queueSummary = summarizeOperatorQueue(normalizedQueueItems);
  const tradeRows = trades.length ? trades.map((t) => `| ${t.date} | ${t.action} | ${t.instrument} | ${t.amount} | ${t.reason} |`).join('\n') : '| YYYY-MM-DD | <action> | <instrument> | 0 | No trades recorded |';
  const compliance = { onStrategy: latestSnapshot ? 'yes, draft state matches approved dry-run plan' : 'unknown', rebalanceNeeded: (executionPlan.rows || []).some(Boolean) ? 'yes' : 'no', riskLimitsBreached: executionPlan.totals.executionGapChf > 0 ? 'no, but draft sizing leaves residual cash' : 'no', brokerReadiness: brokerReadiness?.message || 'unknown', inflightOrders: ((lifecycleSummary?.staged || 0) + (lifecycleSummary?.submitted || 0) + (lifecycleSummary?.partiallyFilled || 0)) > 0 ? 'yes' : 'no' };
  const recommendationUrgency = deriveRecommendationUrgency({ brokerReadiness, lifecycleSummary, queueSummary, executionPlan, freshness, deliveryStatus });
  const incidentSummary = buildIncidentSummary({ brokerReadiness, lifecycleSummary, freshness, brokerErrorState, queueSummary });
  const changeSummary = buildChangeSummary({ latestSnapshot, previousSnapshot: previousReportContext?.snapshot || null, lifecycleSummary, previousLifecycleSummary: previousReportContext?.lifecycleSummary || null, queueSummary, previousQueueSummary: previousReportContext?.queueSummary || null });
  const executiveSummary = narrativeSummary({ latestSnapshot, brokerReadiness, lifecycleSummary, freshness, generationMeta, deliveryStatus });
  return `# Portfolio Report: ${portfolioName}

## Period
- Report type: ${period}
- Period start: ${start}
- Period end: ${end}
- Generated: ${generated}

## Decision View

### Executive Summary
${executiveSummary}

### Incident / Blocker Summary
${incidentSummary}

### What Changed Since Last Report
${changeSummary}

### Recommendation Urgency
- Current urgency: ${urgencyLabel(recommendationUrgency)}

### Recommended Changes
${formatUrgentAction('Recommendation', brokerReadiness?.fallbackRequired ? 'Restore Interactive Brokers connectivity, then resolve contract ids and re-run live-priced dry-run proposals.' : executionPlan.totals.executionGapChf > 0 ? 'Revisit whole-share sizing once live prices are available, or intentionally keep residual tradable cash unallocated.' : deliveryStatus?.ready === false ? 'Clear the reporting pending-action list or explicitly accept the degraded local-only posture before wider operational use.' : 'Connect live broker pricing to replace draft assumptions before enabling execution.', recommendationUrgency)}

### Next Actions
${formatUrgentAction('Next action', brokerReadiness?.fallbackRequired ? 'Validate Interactive Brokers gateway/session reachability before treating any proposal as broker-backed.' : (lifecycleSummary?.approved || 0) > 0 ? 'Stage or review approved trades when broker readiness is healthy and confirmation gates are satisfied.' : executionPlan.rows.length ? 'Approve or revise the current dry-run order set, then validate live read-only broker connectivity.' : deliveryStatus?.ready === false ? 'Run the local report-delivery readiness check and resolve the surfaced operator actions.' : 'Generate the next dry-run proposal set after holdings or strategy changes.', recommendationUrgency)}

## Audit Detail

### Allocation Review
| Asset class | Start % | End % | Target % | Drift % |
|---|---:|---:|---:|---:|
| Core | 0 | 0 | 0 | 0 |

### Performance
| Metric | Value |
|---|---:|
| Start value CHF | ${latestSnapshot ? latestSnapshot.totalValue : ''} |
| End value CHF | ${latestSnapshot ? latestSnapshot.totalValue : ''} |
| Change CHF | ${latestSnapshot ? latestSnapshot.dailyChange : ''} |
| Change % | ${latestSnapshot ? latestSnapshot.dailyChangePct : ''} |

### Trades During Period
| Date | Action | Instrument | Amount CHF | Reason |
|---|---|---|---:|---|
${tradeRows}

### Strategy Compliance
- On strategy: ${compliance.onStrategy}
- Rebalance needed: ${compliance.rebalanceNeeded}
- Risk limits breached: ${compliance.riskLimitsBreached}
- Broker readiness: ${compliance.brokerReadiness}
- In-flight orders: ${compliance.inflightOrders}

### Freshness
- Dashboard stale: ${freshness?.stale ? 'yes' : 'no'}
- Dashboard file present: ${freshness?.dashboardExists === false ? 'no' : 'yes'}
- Newest source file: ${freshness?.newestSourcePath || 'unknown'}

### Delivery Status
${formatDeliveryStatus(deliveryStatus)}

### Operator Queue Summary
${formatOperatorQueueSummary(queueSummary)}

### Pending Operator Actions
${formatPendingActions(compactRowText(normalizedQueueItems, 4))}

### Operator State
- Broker automation paused: ${brokerErrorState?.stopAutomation ? 'yes' : 'no'}
- Consecutive broker errors: ${brokerErrorState?.consecutive || 0}
- Last broker error reason: ${brokerErrorState?.lastReason || 'none'}

### Generation Status
${formatGenerationStatus(generationMeta)}

### Execution Lifecycle
- Proposed: ${lifecycleSummary?.proposed || 0}
- Approved: ${lifecycleSummary?.approved || 0}
- Staged: ${lifecycleSummary?.staged || 0}
- Submitted: ${lifecycleSummary?.submitted || 0}
- Partially filled: ${lifecycleSummary?.partiallyFilled || 0}
- Filled: ${lifecycleSummary?.filled || 0}
- Cancelled: ${lifecycleSummary?.cancelled || 0}
- Failed: ${lifecycleSummary?.failed || 0}

### Execution Plan
- Rows: ${(executionPlan.rows || []).length}
- Executable CHF: ${executionPlan.totals.executableChf}
- Intended CHF: ${executionPlan.totals.intendedChf}
- Gap CHF: ${executionPlan.totals.executionGapChf}

### What Worked
- The dry-run portfolio state is consistent enough to review as one workflow.

### What Did Not Work
${brokerReadiness?.fallbackRequired ? `- ${brokerReadiness.message}` : (lifecycleSummary?.failed || 0) > 0 ? `- ${lifecycleSummary.failed} execution row(s) are marked failed and still need operator review.` : executionPlan.totals.executionGapChf > 0 ? `- Draft order sizing still leaves CHF ${executionPlan.totals.executionGapChf} below intended executable deployment.` : generationMeta?.renderWarning ? `- Report rendering required fallback handling: ${generationMeta.renderWarning}` : deliveryStatus?.ready === false ? `- Reporting delivery posture still has ${(pendingActions || []).length} operator-facing pending action(s).` : '- Live broker pricing and order quoting are not connected yet.'}
`;
}

function writeReport({ portfolioDir, period, dateStamp, content }) {
  const portfolioName = path.basename(portfolioDir);
  const outDir = path.join(portfolioDir, 'reports', period);
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `portfolio_report_${portfolioName}_${period}_${dateStamp}.md`;
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, content);
  return outPath;
}

async function generateAndWriteReport({ portfolioDir, period, dateStamp, workflow = null }) {
  const resolvedDateStamp = dateStamp || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const historyPath = path.join(portfolioDir, 'history.md');
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const trades = recentTrades(tradesPath);
  const latestSnapshot = latestHistory(historyPath);
  const portfolioName = path.basename(portfolioDir);
  const dashboardPath = path.join(portfolioDir, 'dashboard.md');
  const bounds = { start: resolvedDateStamp, end: resolvedDateStamp };
  const executionPlan = { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } };
  const brokerReadiness = await getInteractiveBrokersReadiness({ portfolio: portfolioName });
  const lifecycleSummary = executionLifecycleSummary(tradesPath, { actionableOnly: true });
  const freshness = fileFreshnessSummary({ dashboardPath, sourcePaths: [portfolioPath, path.join(portfolioDir, 'holdings.md'), tradesPath, historyPath] });
  const brokerErrorState = brokerErrorStatus(portfolioName);
  const initialGenerationMeta = { markdownWritten: true, pdfMode: 'pending', pdfPath: null, htmlPath: null, renderWarning: null };
  const initialDeliveryStatus = reportDeliveryStatus({ portfolioDir, generationMeta: initialGenerationMeta, workflow });
  const initialPendingActions = reportPendingActions({ lifecycleSummary, freshness, brokerErrorState, generationMeta: initialGenerationMeta, workflow, policy: initialDeliveryStatus });
  const previousReportContext = loadPreviousReportContext({ portfolioDir, period, currentDateStamp: resolvedDateStamp });
  const markdownPath = writeReport({ portfolioDir, period, dateStamp: resolvedDateStamp, content: formatReport({ portfolioName, period, start: bounds.start, end: bounds.end, generated: new Date().toISOString(), trades, latestSnapshot, executionPlan, brokerReadiness, lifecycleSummary, freshness, generationMeta: initialGenerationMeta, brokerErrorState, deliveryStatus: initialDeliveryStatus, pendingActions: initialPendingActions, previousReportContext }) });
  const generationMeta = { markdownWritten: true, pdfMode: 'skipped', pdfPath: null, htmlPath: null, renderWarning: 'compact reporting mode' };
  const deliveryStatus = reportDeliveryStatus({ portfolioDir, generationMeta, workflow });
  const pendingActions = reportPendingActions({ lifecycleSummary, freshness, brokerErrorState, generationMeta, workflow, policy: deliveryStatus });
  fs.writeFileSync(markdownPath, formatReport({ portfolioName, period, start: bounds.start, end: bounds.end, generated: new Date().toISOString(), trades, latestSnapshot, executionPlan, brokerReadiness, lifecycleSummary, freshness, generationMeta, brokerErrorState, deliveryStatus, pendingActions, previousReportContext }));
  const summary = { portfolio: portfolioName, generatedAt: new Date().toISOString(), totals: { trades: trades.length, queueItems: pendingActions.length, executionGapChf: 0 }, recommendation: deliveryStatus?.ready === false ? 'check delivery posture' : 'hold' };
  const jsonPath = markdownPath.replace(/\.md$/i, '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  return { markdownPath, pdfPath: null, pdfMode: 'skipped', htmlPath: null, jsonPath, summary, generationMeta, deliveryStatus, pendingActions };
}

module.exports = { formatReport, writeReport, generateAndWriteReport, formatGenerationStatus, narrativeSummary, formatDeliveryStatus, formatPendingActions, formatOperatorQueueSummary, formatRuntimeEventSummary, urgencyLabel, deriveRecommendationUrgency, buildIncidentSummary, buildChangeSummary, loadPreviousReportContext };
