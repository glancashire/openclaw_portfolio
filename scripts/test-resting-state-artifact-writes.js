const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const Module = require('module');
const originalLoad = Module._load;
const stubState = {};
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '../brokers/interactive-brokers/readiness') {
    return { getInteractiveBrokersReadiness: async () => ({ fallbackRequired: false, message: 'ready' }) };
  }
  if (request === '../execution/runtimeState') {
    return { brokerErrorStatus: () => ({ stopAutomation: false, consecutive: 0, lastReason: null, lastAt: null }) };
  }
  if (request === './deliveryPolicy') {
    return {
      reportDeliveryStatus: () => ({ ready: true, deliveryMode: 'ready', failureAlertMode: 'ready', pendingActions: [] }),
      effectiveDeliveryPolicy: () => ({ mode: 'ready', ready: true, pendingActions: [], failureAlertMode: 'ready' }),
    };
  }
  if (request === './freshness') {
    return { fileFreshnessSummary: () => ({ stale: false }) };
  }
  if (request === './operatorQueue') {
    return { summarizeOperatorQueue: (items) => ({ total: items.length, blocking: 0, approvals: 0, execution: 0, freshApprovals: 0, staleApprovals: 0, openRunnerQueue: 0, openRunnerRetry: 0, recovery: 0, delivery: 0, data: 0, warnings: 0, workflow: 0, bySeverity: { high: 0, medium: 0, low: 0 } }), classifyActionSeverity: () => 'low', queueTypeForItem: (item) => item.queueType || item.kind || 'workflow' };
  }
  if (request === '../validation/safetyControls') {
    return { evaluateSafetyControls: () => ({ blockers: [], diagnostics: { holdingsHealth: { stalePricing: false } } }) };
  }
  if (request === '../observability/runtimeEvents') {
    return { readRuntimeEvents: () => [], summarizeRuntimeEvents: () => ({ total: 0, byLevel: {}, byCategory: {}, blockedTrades: 0, degradedBrokerEvents: 0, staleDataEvents: 0, openRunnerQueueEvents: 0, openRunnerRetryEvents: 0 }) };
  }
  if (request === './contractIntelligenceStatus') {
    return { summarizeContractIntelligence: () => ({ summaryLine: 'ok', nextAction: 'none' }) };
  }
  if (request === '../execution/tradeState') {
    return { readTradesTable: () => ({ rows: [] }), summarizeOpenRunnerRetryState: () => ({ queuedInitial: 0, queuedRetry: 0 }), staleApprovalInventory: () => [] };
  }
  if (request === '../execution/portfolioHealth') {
    return { buildSelfHealPlan: async () => ({ ok: true, plannedActions: [], classified: [], openIssues: [], operatorCommands: [], actions: [] }) };
  }
  return originalLoad(request, parent, isMain);
};

const { generatePortfolioSummaryArtifacts } = require('../src/reporting/summaryArtifacts');
const { regenerateDashboard } = require('../src/reporting/dashboardGenerator');
const { generateOverviewBoard } = require('../src/reporting/overviewBoard');

function seedPortfolio(repoRoot) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime', 'overview'), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime', 'events'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'events', 'runtime-events.jsonl'), [
    JSON.stringify({ timestamp: '2026-05-23T20:30:00.000Z', level: 'warn', category: 'safety', action: 'controls', portfolio: 'demo', mode: 'dry-run', status: 'blocked', summary: 'Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.', details: {} }),
  ].join('\n') + '\n');
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---:|---:|---:|---:|---|---|---|\n| DEMO | Demo ETF | Equity | 60 | 50 | 70 | SIX | CHF | core |\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n- Date/time: 2026-05-23 06:00:00\n- Source: broker\n- Broker: ibkr\n- Base currency: CHF\n- Total value CHF: 10000\n- Cash CHF: 4000\n- Invested value CHF: 6000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate | Market value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| DEMO | Demo ETF | Equity | 10 | 600 | CHF | 1 | 6000 | 60 | 60 | 0 |\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-23 06:10:00 | proposed | buy | DEMO | Demo ETF | 1 | 600 | 600 | 0 | rebalance | pending |  |\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-23 | end_of_day | 10000 | 6000 | 4000 | 50 | 0.5 | ok |\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
  return portfolioDir;
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

(async function main() {
  const originalNow = Date.now;
  const originalToISOString = Date.prototype.toISOString;
  const fixedNow = new Date('2026-05-23T20:30:00.000Z');
  const fixedIso = fixedNow.toISOString();
  Date.now = () => fixedNow.getTime();
  Date.prototype.toISOString = function toISOString() { return fixedIso; };

  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'resting-state-'));
  const originalCwd = process.cwd();
  try {
    const portfolioDir = seedPortfolio(repoRoot);
    process.chdir(repoRoot);

    const firstSummary = await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles: true });
    const firstDashboard = await regenerateDashboard(portfolioDir);
    const firstOverview = await generateOverviewBoard({ repoRoot, writeFiles: true });

    const before = {
      summary: sha(fs.readFileSync(firstSummary.outPath, 'utf8')),
      summaryHtml: sha(fs.readFileSync(firstSummary.htmlPath, 'utf8')),
      dashboard: sha(fs.readFileSync(firstDashboard, 'utf8')),
      overview: sha(fs.readFileSync(firstOverview.markdownPath, 'utf8')),
    };

    await generatePortfolioSummaryArtifacts({ portfolioDir, writeFiles: true });
    await regenerateDashboard(portfolioDir);
    await generateOverviewBoard({ repoRoot, writeFiles: true });

    const after = {
      summary: sha(fs.readFileSync(firstSummary.outPath, 'utf8')),
      summaryHtml: sha(fs.readFileSync(firstSummary.htmlPath, 'utf8')),
      dashboard: sha(fs.readFileSync(firstDashboard, 'utf8')),
      overview: sha(fs.readFileSync(firstOverview.markdownPath, 'utf8')),
    };

    assert.deepStrictEqual(after, before);
    console.log(JSON.stringify({ ok: true }, null, 2));
  } finally {
    process.chdir(originalCwd);
    Date.now = originalNow;
    Date.prototype.toISOString = originalToISOString;
    Module._load = originalLoad;
  }
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
