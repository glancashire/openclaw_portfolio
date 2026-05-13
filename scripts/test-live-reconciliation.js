const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const Module = require('module');

const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'live-reconcile-'));
const portfolioDir = path.join(repoRoot, 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });
fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });

fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-11 06:33:50 | submitted | buy | AAA | ETF A | 10 | 10 | 100 | 0 | staged | submitted_to_broker | 9105 |  |  |  |  |\n| 2026-05-11 06:34:00 | submitted | buy | BBB | ETF B | 5 | 20 | 100 | 0 | staged | submitted_to_broker | 9107 |  |  |  |  |\n`);
fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: Test\n\n## Daily Valuation History\n\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-11 | end_of_day | 5000 | 0 | 5000 | 0 | 0 | test |\n`);
fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: Test\n\n- Date/time: 2026-05-11 00:00:00\n- Total value CHF: 5000\n- Invested value CHF: 0\n- Cash CHF: 5000\n\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Last price | Market value CHF | Allocation % | Cost basis CHF | Unrealized P/L CHF | Notes |\n|---|---|---:|---:|---:|---:|---:|---:|---|\n`);
fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [] }, null, 2));

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '../brokers/interactive-brokers/client') {
    return {
      InteractiveBrokersClient: class {
        constructor() {
          this.skill = {
            fetchOpenOrders: async () => [{ orderId: 9105, symbol: 'AAA', status: 'Submitted' }],
            fetchExecutions: async () => [{ orderId: 9107, symbol: 'BBB', side: 'BOT', shares: 5, price: 20, time: '2026-05-11T06:35:00Z', execId: 'fill-9107' }],
            fetchCompletedOrders: async () => [{ orderId: 9105, permId: 617503611, symbol: 'AAA', status: 'Cancelled', quantity: 10 }],
          };
          this.native = null;
        }
      },
    };
  }
  if (request === './portfolioExecution') {
    return {
      resyncPortfolioOrders: async () => ({
        ok: true,
        scanned: 2,
        synced: 1,
        cancelled: 1,
        results: [],
      }),
    };
  }
  if (request === '../reporting/dashboardGenerator') {
    return { regenerateDashboard: async (dir) => path.join(dir, 'dashboard.md') };
  }
  if (request === '../reporting/summaryArtifacts') {
    return {
      generatePortfolioSummaryArtifacts: async ({ portfolioDir }) => ({ outPath: path.join(portfolioDir, 'summary.json'), recoveryPath: path.join(portfolioDir, 'recovery-checklist.json') }),
      generateOverviewArtifacts: async () => ({ portfolioIndexPath: path.join(repoRoot, 'runtime', 'overview', 'portfolio-index.json'), pendingActionsPath: path.join(repoRoot, 'runtime', 'overview', 'pending-actions.json') }),
    };
  }
  return originalLoad(request, parent, isMain);
};

const { reconcilePortfolioLiveState } = require('../src/execution/liveReconciliation');

(async () => {
  const result = await reconcilePortfolioLiveState({ portfolioDir, repoRoot, refreshDerivedArtifacts: true });
  assert.strictEqual(result.ok, true, 'expected reconcile ok');
  assert.strictEqual(result.brokerEvidence.openOrders.ok, true, 'expected open-order evidence ok');
  assert.strictEqual(result.brokerEvidence.executions.ok, true, 'expected execution evidence ok');
  assert.strictEqual(result.brokerEvidence.completedOrders.ok, true, 'expected completed-order evidence ok');
  assert.strictEqual(result.fillBackfill.added.length, 0, 'expected no new filled row because test resync is stubbed');
  assert(result.artifacts.dashboardPath.endsWith('dashboard.md'), 'expected dashboard artifact path');
  assert(result.artifacts.summaryPath.endsWith('summary.json'), 'expected summary artifact path');
  assert(result.artifacts.pendingActionsPath.endsWith('pending-actions.json'), 'expected overview artifact path');
  console.log(JSON.stringify({ ok: true, result }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
