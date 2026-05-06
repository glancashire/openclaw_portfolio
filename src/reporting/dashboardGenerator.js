const fs = require('fs');
const path = require('path');
const { analyzeAllocation } = require('../analysis/allocationAnalysis');
const { readApprovedInstruments } = require('../analysis/approvedInstruments');
const { buildExecutionPlan } = require('../analysis/executionPlan');
const { recentTrades, latestTradeProposals, latestHistory, executionLifecycleSummary } = require('./portfolioData');
const { getInteractiveBrokersReadiness } = require('../brokers/interactive-brokers/readiness');
const { brokerErrorStatus } = require('../execution/runtimeState');

function fileFreshnessSummary({ dashboardPath, sourcePaths = [] }) {
  const existingSources = sourcePaths.filter((filePath) => filePath && fs.existsSync(filePath));
  const dashboardExists = dashboardPath && fs.existsSync(dashboardPath);
  const dashboardMtimeMs = dashboardExists ? fs.statSync(dashboardPath).mtimeMs : null;
  const sourceStats = existingSources.map((filePath) => ({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs }));
  const newestSource = sourceStats.sort((a, b) => b.mtimeMs - a.mtimeMs)[0] || null;
  const stale = !dashboardExists || (newestSource && dashboardMtimeMs != null && newestSource.mtimeMs > dashboardMtimeMs);
  return {
    stale: Boolean(stale),
    dashboardExists,
    dashboardMtimeMs,
    newestSourcePath: newestSource ? newestSource.filePath : null,
    newestSourceMtimeMs: newestSource ? newestSource.mtimeMs : null,
  };
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

function strategyStatus(allocations, brokerReadiness) {
  if (brokerReadiness?.fallbackRequired) return 'blocked';
  if (allocations.some((row) => row.status === 'out_of_bounds')) return 'rebalance_needed';
  if (allocations.some((row) => row.status === 'drifted')) return 'minor_drift';
  return 'on_track';
}

function formatAllocationRows(rows) {
  if (!rows.length) return '| <asset class> | 0 | 0 | 0 | blocked |';
  return rows.map((row) => `| ${row.assetClass} | ${row.current} | ${row.target} | ${row.drift} | ${row.status} |`).join('\n');
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

function formatInstrumentOverviewRows(approvedInstruments = [], latestProposals = [], totalValue = 0) {
  if (!approvedInstruments.length) return '| <ticker> | <name> | 0 | 0 | 0 | 0 | blocked |';

  const latestRowsByInstrument = new Map();
  for (const proposal of latestProposals) {
    latestRowsByInstrument.set(proposal.tickerOrIsin, proposal);
  }

  return approvedInstruments.map((instrument) => {
    const proposal = latestRowsByInstrument.get(instrument.tickerOrIsin);
    const plannedValue = Number(proposal?.estimatedChf || 0);
    const plannedPct = totalValue > 0 ? Number(((plannedValue / totalValue) * 100).toFixed(2)) : 0;
    const target = Number(instrument.target || 0);
    const drift = Number((plannedPct - target).toFixed(2));
    const quantityText = proposal?.quantity ? ` (${proposal.quantity} @ ${proposal.limitPrice})` : '';
    const sourceText = proposal?.priceSource ? ` via ${proposal.priceSource}` : '';
    const status = String(proposal?.status || '').trim().toLowerCase();
    const statusPrefix = status === 'approved'
      ? 'approved'
      : status === 'staged' || status === 'submitted' || status === 'partially_filled' || status === 'filled'
        ? 'in_flight'
        : status === 'proposed'
          ? 'proposal'
          : status === 'planned'
            ? 'planned'
            : 'watch';
    const action = proposal
      ? `${statusPrefix}: ${proposal.action} ${plannedValue} CHF${quantityText}${sourceText}`
      : 'watch';
    return `| ${instrument.tickerOrIsin} | ${instrument.name} | ${plannedValue} | ${plannedPct} | ${target} | ${drift} | ${action} |`;
  }).join('\n');
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

function generateDashboard({ portfolioName, holdingsText, allocations = [], approvedInstruments = [], existingTrades = [], latestProposals = [], executionPlan = { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } }, latestSnapshot = null, brokerReadiness = null, lifecycleSummary = null, freshness = null, brokerErrorState = null }) {
  const summary = parseHoldingsSummary(holdingsText);
  const holdingCount = countHoldingRows(holdingsText);
  const totalValue = Number(summary.totalValue || 0);
  const tradeRows = existingTrades.length
    ? existingTrades.map((t) => `| ${t.date} | ${t.action} | ${t.instrument} | ${t.estimatedChf || t.amount} | ${t.status} |`).join('\n')
    : '| YYYY-MM-DD | <action> | <instrument> | 0 | none |';

  const warnings = [
    '- Dashboard regeneration currently computes allocation drift at the asset-class level only.',
  ];
  const proposalTotals = proposalSummary(latestProposals, totalValue);
  if (proposalTotals.residualTradableCash > 0) {
    warnings.push(`- Whole-share draft sizing leaves CHF ${proposalTotals.residualTradableCash} unallocated beyond the intentional CHF cash sleeve.`);
  }
  if (brokerReadiness?.fallbackRequired) warnings.push(`- ${brokerReadiness.message}`);
  if (brokerErrorState?.stopAutomation) warnings.push(`- Broker automation is paused after ${brokerErrorState.consecutive} consecutive broker errors (${brokerErrorState.lastReason || 'unknown reason'}).`);
  if ((lifecycleSummary?.failed || 0) > 0) warnings.push(`- ${lifecycleSummary.failed} trade log row(s) are currently marked failed and may need manual review.`);
  if ((lifecycleSummary?.rejected || 0) > 0) warnings.push(`- ${lifecycleSummary.rejected} trade log row(s) were explicitly rejected by an operator.`);
  if ((lifecycleSummary?.submitted || 0) > 0 || (lifecycleSummary?.partiallyFilled || 0) > 0) warnings.push('- There are in-flight broker order states; avoid overlapping execution plans until reconciliation is current.');
  if (freshness?.stale) warnings.push(`- Dashboard freshness warning: source state changed after the dashboard was last written (${freshness.newestSourcePath || 'unknown source'}).`);
  if (latestSnapshot?.notes) warnings.push(`- Latest history note: ${latestSnapshot.notes}`);
  const actions = recommendedActions(existingTrades, latestProposals, totalValue, brokerReadiness, lifecycleSummary);

  return `# Dashboard: ${portfolioName}\n\n## Summary\n- Total value: CHF ${summary.totalValue}\n- Cash: CHF ${summary.cash}\n- Invested: CHF ${summary.invested}\n- Number of holdings: ${holdingCount}\n- Strategy status: ${strategyStatus(allocations, brokerReadiness)}\n- Last sync: ${summary.syncTime}\n- Last rebalance check: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}\n- Broker readiness: ${brokerReadiness?.message || 'unknown'}\n- Broker automation paused: ${brokerErrorState?.stopAutomation ? 'yes' : 'no'}\n\n## Freshness\n- Dashboard stale: ${freshness?.stale ? 'yes' : 'no'}\n- Dashboard file present: ${freshness?.dashboardExists === false ? 'no' : 'yes'}\n- Newest source file: ${freshness?.newestSourcePath || 'unknown'}\n\n## Allocation vs Target\n| Asset class | Current % | Target % | Drift % | Status |\n|---|---:|---:|---:|---|\n${formatAllocationRows(allocations)}\n\n## Instrument Overview\n| Ticker / ISIN | Name | Planned CHF | Planned % | Target % | Drift % | Action |\n|---|---|---:|---:|---:|---:|---|\n${formatInstrumentOverviewRows(approvedInstruments, latestProposals, totalValue)}\n\n## Recommended Actions\n1. ${actions[0]}\n2. ${actions[1]}\n\n## Risk Warnings\n${warnings.join('\n')}\n\n## Execution Lifecycle\n${formatExecutionLifecycle(lifecycleSummary)}\n\n## Execution Plan\n${formatExecutionPlan(executionPlan)}\n\n## Recent Trades\n| Date | Action | Instrument | Amount CHF | Status |\n|---|---|---|---:|---|\n${tradeRows}\n`;
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
  const latestProposals = latestTradeProposals(tradesPath);
  const brokerReadiness = await getInteractiveBrokersReadiness({ portfolio: portfolioName });
  const sourcePaths = [portfolioPath, holdingsPath, tradesPath, historyPath];
  const currentBrokerErrorState = brokerErrorStatus(portfolioName);
  let freshness = fileFreshnessSummary({ dashboardPath, sourcePaths });
  let dashboard = generateDashboard({
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
  });
  fs.writeFileSync(dashboardPath, dashboard);
  freshness = fileFreshnessSummary({ dashboardPath, sourcePaths });
  dashboard = generateDashboard({
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
  });
  fs.writeFileSync(dashboardPath, dashboard);
  return dashboardPath;
}

module.exports = { generateDashboard, regenerateDashboard, formatExecutionLifecycle, fileFreshnessSummary };
