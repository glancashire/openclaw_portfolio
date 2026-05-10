'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const assert = require('assert');

const target = path.resolve(process.cwd(), 'src/execution/liveReadinessPreflight.js');

function createPortfolioFixture({ executionMode = 'require_confirmation', trades = '', state = {} } = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'live-readiness-preflight-'));
  const portfolioDir = path.join(tempDir, 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'runtime'), { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ETF\n\n## Status\n- Status: active\n- Broker account reference: UTEST123\n- Execution mode: ${executionMode}\n`);
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: ETF\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n${trades}`);
  fs.writeFileSync(path.join(tempDir, 'runtime', 'execution-state.json'), JSON.stringify(state, null, 2));
  return { tempDir, portfolioDir };
}

function loadWithMocks(readiness) {
  const original = Module._load;
  delete require.cache[target];
  Module._load = function(request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return { getInteractiveBrokersReadiness: async () => readiness };
    }
    return original.apply(this, arguments);
  };
  try {
    return require(target);
  } finally {
    Module._load = original;
  }
}

(async () => {
  const cwd = process.cwd();

  // broker unready + no approvals
  {
    const { tempDir, portfolioDir } = createPortfolioFixture({
      executionMode: 'require_confirmation',
      trades: '| 2026-05-10 09:00:00 | proposed | buy | AAA | ETF A | 1 | 100 | 100 | 0 | proposed row | pending_user_approval |  |  |  |  |  |\n',
    });
    process.chdir(tempDir);
    const mod = loadWithMocks({ configured: true, authenticated: false, reachable: false, fallbackRequired: true, message: 'not ready' });
    const result = await mod.evaluateLiveReadinessPreflight({ portfolioDir, now: new Date('2026-05-10T11:00:00Z') });
    assert.strictEqual(result.ok, false);
    assert(result.blockers.some((b) => b.code === 'broker_unready'));
    assert(result.blockers.some((b) => b.code === 'approval_state_mismatch'));
    process.chdir(cwd);
  }

  // stale approval
  {
    const { tempDir, portfolioDir } = createPortfolioFixture({
      executionMode: 'transmitted_live',
      trades: '| 2026-05-08 09:00:00 | approved | buy | AAA | ETF A | 1 | 100 | 100 | 0 | approved row | user_approved |  |  |  |  |  |\n',
      state: { liveExecutionArms: { etf: { armedAt: '2026-05-10T08:00:00Z', expiresAt: '2026-05-10T18:00:00Z', note: 'armed' } } },
    });
    process.chdir(tempDir);
    const mod = loadWithMocks({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, message: 'ready' });
    const result = await mod.evaluateLiveReadinessPreflight({ portfolioDir, now: new Date('2026-05-10T11:00:00Z'), maxApprovalAgeHours: 24 });
    assert.strictEqual(result.ok, false);
    assert(result.blockers.some((b) => b.code === 'stale_approval'));
    process.chdir(cwd);
  }

  // green path
  {
    const { tempDir, portfolioDir } = createPortfolioFixture({
      executionMode: 'transmitted_live',
      trades: '| 2026-05-10 10:30:00 | approved | buy | AAA | ETF A | 1 | 100 | 100 | 0 | approved row | user_approved |  |  |  |  |  |\n',
    });
    process.chdir(tempDir);
    const mod = loadWithMocks({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, message: 'ready' });
    mod.armLiveExecutionWindow(portfolioDir, { expiresAt: '2026-05-10T18:00:00Z', note: 'armed' });
    const result = await mod.evaluateLiveReadinessPreflight({ portfolioDir, now: new Date('2026-05-10T11:00:00Z'), maxApprovalAgeHours: 24 });
    assert.strictEqual(result.ok, true, JSON.stringify(result.blockers));
    assert.strictEqual(result.armedForMarketOpen, true);
    assert.strictEqual(result.approvalState.approvedCount, 1);
    process.chdir(cwd);
  }

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
