const fs = require('fs');
const path = require('path');
const { recentTrades, latestHistory, executionLifecycleSummary } = require('./portfolioData');
const { buildExecutionPlan } = require('../analysis/executionPlan');
const { renderPdf } = require('./pdfExport');
const { getInteractiveBrokersReadiness } = require('../brokers/interactive-brokers/readiness');

function defaultPeriodBounds(period, latestSnapshot) {
  const end = latestSnapshot?.date || new Date().toISOString().slice(0, 10);
  if (period === 'weekly') return { start: end, end };
  if (period === 'monthly') return { start: end.slice(0, 8) + '01', end };
  if (period === 'quarterly') {
    const [year, month] = end.split('-').map(Number);
    const quarterStartMonth = month <= 3 ? 1 : month <= 6 ? 4 : month <= 9 ? 7 : 10;
    return { start: `${year}-${String(quarterStartMonth).padStart(2, '0')}-01`, end };
  }
  return { start: end, end };
}

function formatCompliance({ latestSnapshot, trades, executionPlan, brokerReadiness, lifecycleSummary }) {
  const hasPending = trades.some((trade) => trade.status === 'proposed' || trade.status === 'planned');
  const hasInflight = (lifecycleSummary?.submitted || 0) > 0 || (lifecycleSummary?.partiallyFilled || 0) > 0;
  return {
    onStrategy: latestSnapshot ? 'yes, draft state matches approved dry-run plan' : 'unknown',
    rebalanceNeeded: hasPending ? 'yes' : 'no',
    riskLimitsBreached: executionPlan.totals.executionGapChf > 0 ? 'no, but draft sizing leaves residual cash' : 'no',
    brokerReadiness: brokerReadiness?.message || 'unknown',
    inflightOrders: hasInflight ? 'yes' : 'no',
  };
}

function formatAllocationReview(executionPlan) {
  const grouped = new Map();
  for (const row of executionPlan.rows) {
    const key = row.action === 'hold' ? 'Bonds / cash-like' : (row.name.includes('SLI') ? 'Swiss equities' : 'Global equities');
    const current = grouped.get(key) || { endPct: 0, targetPct: 0 };
    current.endPct += Number(row.executablePct || 0);
    current.targetPct += Number(row.targetPct || 0);
    grouped.set(key, current);
  }

  const ordered = [
    ['Global equities', 60],
    ['Swiss equities', 20],
    ['Bonds / cash-like', 20],
  ];

  return ordered.map(([assetClass, defaultTarget]) => {
    const row = grouped.get(assetClass) || { endPct: 0, targetPct: defaultTarget };
    const drift = Number((row.endPct - defaultTarget).toFixed(2));
    return `| ${assetClass} | 0 | ${Number(row.endPct.toFixed(2))} | ${defaultTarget} | ${drift} |`;
  }).join('\n');
}

function formatExecutionPlanSection(executionPlan) {
  if (!executionPlan.rows.length) return '- No execution plan available.';
  const rows = executionPlan.rows.map((row) => `- ${row.tickerOrIsin}: action ${row.action}, quantity ${row.quantity}, limit ${row.limitPrice}, executable CHF ${row.executableChf}, target ${row.targetPct}%`);
  rows.push(`- Totals: executable CHF ${executionPlan.totals.executableChf}, intended CHF ${executionPlan.totals.intendedChf}, gap CHF ${executionPlan.totals.executionGapChf}`);
  return rows.join('\n');
}

function formatExecutionLifecycleSection(lifecycleSummary = {}) {
  return [
    `- Proposed: ${lifecycleSummary.proposed || 0}`,
    `- Approved: ${lifecycleSummary.approved || 0}`,
    `- Submitted: ${lifecycleSummary.submitted || 0}`,
    `- Partially filled: ${lifecycleSummary.partiallyFilled || 0}`,
    `- Filled: ${lifecycleSummary.filled || 0}`,
    `- Cancelled: ${lifecycleSummary.cancelled || 0}`,
    `- Failed: ${lifecycleSummary.failed || 0}`,
    `- Rows with broker order id: ${lifecycleSummary.withBrokerOrderId || 0}`,
  ].join('\n');
}

function formatReport({ portfolioName, period, start = '', end = '', generated = '', trades = [], latestSnapshot = null, executionPlan = { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } }, brokerReadiness = null, lifecycleSummary = null }) {
  const tradeRows = trades.length
    ? trades.map((t) => `| ${t.date} | ${t.action} | ${t.instrument} | ${t.amount} | ${t.reason} |`).join('\n')
    : '| YYYY-MM-DD | <action> | <instrument> | 0 | No trades recorded |';
  const compliance = formatCompliance({ latestSnapshot, trades, executionPlan, brokerReadiness, lifecycleSummary });
  const whatWorked = latestSnapshot
    ? '- The dry-run portfolio state, trade log, dashboard, and execution lifecycle summary are consistent enough to review as one workflow.'
    : '- Initial reporting scaffold is in place.';
  const whatDidNotWork = brokerReadiness?.fallbackRequired
    ? `- ${brokerReadiness.message}`
    : (lifecycleSummary?.failed || 0) > 0
      ? `- ${lifecycleSummary.failed} execution row(s) are marked failed and still need operator review.`
      : executionPlan.totals.executionGapChf > 0
        ? `- Draft order sizing still leaves CHF ${executionPlan.totals.executionGapChf} below intended executable deployment.`
        : '- Live broker pricing and order quoting are not connected yet.';
  const recommendedChanges = brokerReadiness?.fallbackRequired
    ? '- Restore Interactive Brokers connectivity, then resolve contract ids and re-run live-priced dry-run proposals.'
    : (lifecycleSummary?.submitted || 0) > 0 || (lifecycleSummary?.partiallyFilled || 0) > 0
      ? '- Reconcile in-flight orders before approving overlapping new plans or revising allocations.'
      : executionPlan.totals.executionGapChf > 0
        ? '- Revisit whole-share sizing once live prices are available, or intentionally keep residual tradable cash unallocated.'
        : '- Connect live broker pricing to replace draft assumptions before enabling execution.';
  const nextActions = brokerReadiness?.fallbackRequired
    ? '- Validate Interactive Brokers gateway/session reachability before treating any proposal as broker-backed.'
    : (lifecycleSummary?.approved || 0) > 0
      ? '- Stage or review approved trades when broker readiness is healthy and confirmation gates are satisfied.'
      : executionPlan.rows.length
        ? '- Approve or revise the current dry-run order set, then validate live read-only broker connectivity.'
        : '- Generate the next dry-run proposal set after holdings or strategy changes.';

  return `# Portfolio Report: ${portfolioName}\n\n## Period\n- Report type: ${period}\n- Period start: ${start}\n- Period end: ${end}\n- Generated: ${generated}\n\n## Executive Summary\n${latestSnapshot ? `Latest snapshot: CHF ${latestSnapshot.totalValue} total, CHF ${latestSnapshot.cash} cash. Execution lifecycle state is tracked in Markdown, but broker execution remains disabled for real writes.` : 'Short summary pending performance and allocation engine implementation.'}\n\n## Performance\n| Metric | Value |\n|---|---:|\n| Start value CHF | ${latestSnapshot ? latestSnapshot.totalValue : ''} |\n| End value CHF | ${latestSnapshot ? latestSnapshot.totalValue : ''} |\n| Change CHF | ${latestSnapshot ? latestSnapshot.dailyChange : ''} |\n| Change % | ${latestSnapshot ? latestSnapshot.dailyChangePct : ''} |\n\n## Allocation Review\n| Asset class | Start % | End % | Target % | Drift % |\n|---|---:|---:|---:|---:|\n${formatAllocationReview(executionPlan)}\n\n## Trades During Period\n| Date | Action | Instrument | Amount CHF | Reason |\n|---|---|---|---:|---|\n${tradeRows}\n\n## Strategy Compliance\n- On strategy: ${compliance.onStrategy}\n- Rebalance needed: ${compliance.rebalanceNeeded}\n- Risk limits breached: ${compliance.riskLimitsBreached}\n- Broker readiness: ${compliance.brokerReadiness}\n- In-flight orders: ${compliance.inflightOrders}\n\n## Execution Lifecycle\n${formatExecutionLifecycleSection(lifecycleSummary)}\n\n## Execution Plan\n${formatExecutionPlanSection(executionPlan)}\n\n## What Worked\n${whatWorked}\n\n## What Did Not Work\n${whatDidNotWork}\n\n## Recommended Changes\n${recommendedChanges}\n\n## Next Actions\n${nextActions}\n`;
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

async function generateAndWriteReport({ portfolioDir, period, dateStamp }) {
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const historyPath = path.join(portfolioDir, 'history.md');
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const trades = recentTrades(tradesPath);
  const latestSnapshot = latestHistory(historyPath);
  const portfolioName = path.basename(portfolioDir);
  const bounds = defaultPeriodBounds(period, latestSnapshot);
  const executionPlan = buildExecutionPlan({ portfolioPath, tradesPath, totalValue: Number(latestSnapshot?.totalValue || 0) });
  const brokerReadiness = await getInteractiveBrokersReadiness({ portfolio: portfolioName });
  const lifecycleSummary = executionLifecycleSummary(tradesPath);
  const content = formatReport({
    portfolioName,
    period,
    start: bounds.start,
    end: bounds.end,
    generated: new Date().toISOString(),
    trades,
    latestSnapshot,
    executionPlan,
    brokerReadiness,
    lifecycleSummary,
  });
  const markdownPath = writeReport({ portfolioDir, period, dateStamp, content });
  const pdf = renderPdf(markdownPath);
  return { markdownPath, pdfPath: pdf.pdfPath, pdfMode: pdf.mode, htmlPath: pdf.htmlPath || null };
}

module.exports = { formatReport, writeReport, generateAndWriteReport, formatExecutionLifecycleSection };
