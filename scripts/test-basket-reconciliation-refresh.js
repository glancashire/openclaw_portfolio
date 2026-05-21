const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basket-reconcile-'));
process.chdir(repoDir);

const portfolioDir = path.join(repoDir, 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });
fs.mkdirSync(path.join(repoDir, 'runtime'), { recursive: true });
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: ETF\n');
fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n- Date/time: 2026-05-21 22:00:00\n- Invested value CHF: 0\n- Unmatched holdings: none\n- Pricing source: live\n');
fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n');
fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-21 22:00:00 | filled | buy | IE00B5BMR087 | SXR8 | 2 | 689.2 | 0 | 0 | seeded | submitted_to_broker | 9123 |\n');

const fillStateDir = path.join(repoDir, 'runtime');
fs.writeFileSync(path.join(fillStateDir, 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [], acknowledgedBackfilledFills: [] }, null, 2));

const approvalDir = path.join(repoDir, 'runtime', 'approved-order-baskets', 'etf');
fs.mkdirSync(approvalDir, { recursive: true });
fs.writeFileSync(path.join(approvalDir, 'basket-183e.json'), JSON.stringify({
  schemaVersion: '1.0',
  approvalId: 'basket-183e',
  portfolio: 'etf',
  createdAt: '2026-05-21T22:00:00Z',
  expiresAt: '2099-05-21T22:00:00Z',
  executionPolicy: { continueOnIndependentFailure: true, requireCompactReapprovalOnPriceDrift: true, substitutionAllowed: false },
  legs: [
    { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8', conid: '75776072', action: 'BUY', quantity: 2, limitPrice: 689.2, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', maxAttempts: 1, retryPolicy: 'none', allowSubstitution: false, status: 'approved', reason: null },
  ],
  summary: null,
  source: 'operator_approved',
}, null, 2));

const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '../brokers/interactive-brokers/client') {
    return {
      InteractiveBrokersClient: class {
        constructor() {
          this.native = { fetchOpenOrders: async () => [] };
          this.skill = {
            fetchExecutions: async () => [],
            fetchCompletedOrders: async () => [],
          };
        }
      },
    };
  }
  if (request === './portfolioExecution') {
    return {
      resyncPortfolioOrders: async () => ({ ok: true, refreshed: true }),
    };
  }
  if (request === '../reporting/dashboardGenerator') {
    return {
      regenerateDashboard: async (dir) => {
        const out = path.join(dir, 'dashboard.md');
        fs.writeFileSync(out, '# Dashboard refreshed\n');
        return out;
      },
    };
  }
  if (request === '../reporting/summaryArtifacts') {
    return {
      generatePortfolioSummaryArtifacts: async ({ portfolioDir }) => {
        const outPath = path.join(portfolioDir, 'summary.json');
        const recoveryPath = path.join(portfolioDir, 'recovery-checklist.md');
        fs.writeFileSync(outPath, JSON.stringify({ ok: true }, null, 2));
        fs.writeFileSync(recoveryPath, '# Recovery\n');
        return { outPath, recoveryPath };
      },
      generateOverviewArtifacts: async () => {
        const portfolioIndexPath = path.join(repoDir, 'runtime', 'overview', 'daily-summary.json');
        const pendingActionsPath = path.join(repoDir, 'runtime', 'overview', 'pending-actions.json');
        fs.mkdirSync(path.dirname(portfolioIndexPath), { recursive: true });
        fs.writeFileSync(portfolioIndexPath, JSON.stringify({ ok: true }, null, 2));
        fs.writeFileSync(pendingActionsPath, JSON.stringify({ items: [] }, null, 2));
        return { portfolioIndexPath, pendingActionsPath };
      },
    };
  }
  if (request === './basketExecutionRunner') {
    return {
      executeApprovedBasket: async () => ({ path: path.join(repoDir, 'runtime', 'basket-runs', 'etf', 'basket-183e.json'), runState: { status: 'submitted', summary: { executed: 1, blocked: 0, failed: 0, total: 1 } } }),
    };
  }
  return originalLoad(request, parent, isMain);
};

const { refreshBasketExecutionArtifacts } = require('../src/execution/liveReconciliation');

(async () => {
  const result = await refreshBasketExecutionArtifacts({
    portfolioDir,
    repoRoot: repoDir,
    approvalId: 'basket-183e',
    executeBasket: true,
    detectDrift: true,
    refreshDerivedArtifacts: true,
    now: new Date('2026-05-21T23:00:00Z'),
  });

  assert.strictEqual(result.ok, true);
  assert(result.fillBackfill.added.includes(9123));
  assert(result.basketRun);
  assert.strictEqual(result.basketRun.runState.summary.executed, 1);
  assert(result.basketDrift);
  assert.strictEqual(result.basketDrift.affectedLegCount, 0);
  assert(fs.existsSync(result.artifacts.dashboardPath));
  assert(fs.existsSync(result.artifacts.summaryPath));
  assert(fs.existsSync(result.artifacts.pendingActionsPath));

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
}).finally(() => {
  Module._load = originalLoad;
});
