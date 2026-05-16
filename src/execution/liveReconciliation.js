const fs = require('fs');
const path = require('path');
const { InteractiveBrokersClient } = require('../brokers/interactive-brokers/client');
const { resyncPortfolioOrders } = require('./portfolioExecution');
const { readTradesTable, listOpenBrokerOrderRows } = require('./tradeState');
const { regenerateDashboard } = require('../reporting/dashboardGenerator');
const { generatePortfolioSummaryArtifacts, generateOverviewArtifacts } = require('../reporting/summaryArtifacts');
const {
  loadFillNotificationState,
  saveFillNotificationState,
  fillNotificationStatePath,
} = require('../reporting/fillNotificationState');

function reconcileFillNotificationBacklog({ portfolioDir, repoRoot = process.cwd() }) {
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const state = loadFillNotificationState(repoRoot);
  const notified = new Set((state.notifiedFills || []).map(Number));
  const reconciled = new Set((state.reconciledUnnotifiedFills || []).map(Number));
  const acknowledged = new Set((state.acknowledgedBackfilledFills || []).map(Number));
  const { rows } = readTradesTable(tradesPath);

  const added = [];
  for (const row of rows) {
    if (String(row.Status || '').trim().toLowerCase() !== 'filled') continue;
    const orderId = Number(row['Broker order id'] || 0);
    if (!Number.isFinite(orderId) || orderId <= 0) continue;
    if (notified.has(orderId) || reconciled.has(orderId) || acknowledged.has(orderId)) continue;
    reconciled.add(orderId);
    added.push(orderId);
  }

  const next = {
    notifiedFills: Array.from(notified).sort((a, b) => a - b),
    reconciledUnnotifiedFills: Array.from(reconciled).sort((a, b) => a - b),
    acknowledgedBackfilledFills: Array.from(acknowledged).sort((a, b) => a - b),
  };
  saveFillNotificationState(repoRoot, next);
  const statePath = fillNotificationStatePath(repoRoot);
  return { added, state: next, statePath };
}

async function fetchBrokerLiveEvidence({ portfolio }) {
  const client = new InteractiveBrokersClient({ portfolio });
  const evidence = {
    openOrders: { ok: false, count: 0, rows: [], error: null },
    executions: { ok: false, count: 0, rows: [], error: null },
    completedOrders: { ok: false, count: 0, rows: [], error: null },
  };

  if (client.native && typeof client.native.fetchOpenOrders === 'function') {
    try {
      const rows = await client.native.fetchOpenOrders();
      evidence.openOrders = { ok: true, count: Array.isArray(rows) ? rows.length : 0, rows: Array.isArray(rows) ? rows : [], error: null, source: 'native' };
    } catch (error) {
      evidence.openOrders = { ok: false, count: 0, rows: [], error: error.message, source: 'native' };
    }
  } else if (client.skill && typeof client.skill.fetchOpenOrders === 'function') {
    try {
      const rows = await client.skill.fetchOpenOrders();
      evidence.openOrders = { ok: true, count: Array.isArray(rows) ? rows.length : 0, rows: Array.isArray(rows) ? rows : [], error: null, source: 'skill' };
    } catch (error) {
      evidence.openOrders = { ok: false, count: 0, rows: [], error: error.message, source: 'skill' };
    }
  }

  if (client.skill && typeof client.skill.fetchExecutions === 'function') {
    try {
      const rows = await client.skill.fetchExecutions();
      evidence.executions = { ok: true, count: Array.isArray(rows) ? rows.length : 0, rows: Array.isArray(rows) ? rows : [], error: null, source: 'skill' };
    } catch (error) {
      evidence.executions = { ok: false, count: 0, rows: [], error: error.message, source: 'skill' };
    }
  }

  if (client.skill && typeof client.skill.fetchCompletedOrders === 'function') {
    try {
      const rows = await client.skill.fetchCompletedOrders();
      evidence.completedOrders = { ok: true, count: Array.isArray(rows) ? rows.length : 0, rows: Array.isArray(rows) ? rows : [], error: null, source: 'skill' };
    } catch (error) {
      evidence.completedOrders = { ok: false, count: 0, rows: [], error: error.message, source: 'skill' };
    }
  }

  return evidence;
}

async function reconcilePortfolioLiveState({ portfolioDir, repoRoot = process.cwd(), refreshDerivedArtifacts = true }) {
  const portfolio = path.basename(portfolioDir);
  const openRowsBefore = listOpenBrokerOrderRows(path.join(portfolioDir, 'trades.md'));
  const brokerEvidence = await fetchBrokerLiveEvidence({ portfolio });
  const orderResync = await resyncPortfolioOrders({ portfolioDir, refreshHoldingsOnFill: true });
  const fillBackfill = reconcileFillNotificationBacklog({ portfolioDir, repoRoot });

  let dashboardPath = null;
  let summaryArtifacts = null;
  let overviewArtifacts = null;
  if (refreshDerivedArtifacts) {
    dashboardPath = await regenerateDashboard(portfolioDir);
    summaryArtifacts = await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles: true });
    overviewArtifacts = await generateOverviewArtifacts({ writeFiles: true });
  }

  const openRowsAfter = listOpenBrokerOrderRows(path.join(portfolioDir, 'trades.md'));
  return {
    ok: orderResync.ok,
    portfolio,
    brokerEvidence,
    openRowsBefore,
    openRowsAfter,
    orderResync,
    fillBackfill,
    artifacts: refreshDerivedArtifacts ? {
      dashboardPath,
      summaryPath: summaryArtifacts?.outPath || null,
      recoveryPath: summaryArtifacts?.recoveryPath || null,
      portfolioIndexPath: overviewArtifacts?.portfolioIndexPath || null,
      pendingActionsPath: overviewArtifacts?.pendingActionsPath || null,
    } : null,
  };
}

module.exports = {
  reconcilePortfolioLiveState,
  reconcileFillNotificationBacklog,
  loadFillNotificationState,
  saveFillNotificationState,
  fetchBrokerLiveEvidence,
};
