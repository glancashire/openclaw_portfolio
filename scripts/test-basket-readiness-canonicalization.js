'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const assert = require('assert');

const readinessTarget = path.resolve(process.cwd(), 'src/execution/liveReadinessPreflight.js');
const authorityTarget = path.resolve(process.cwd(), 'src/execution/executionAuthority.js');
const { saveApprovalEnvelope } = require('../src/execution/basketApprovalStore');

function createPortfolioFixture({ executionMode = 'transmitted_live', trades = '', state = {} } = {}) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'basket-readiness-'));
  const portfolioRoot = path.join(tempDir, 'portfolio');
  const portfolioDir = path.join(portfolioRoot, 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.mkdirSync(path.join(tempDir, 'runtime'), { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ETF\n\n## Status\n- Status: active\n- Broker account reference: UTEST123\n- Execution mode: ${executionMode}\n- Require confirmation before first live trade: false\n- Require user approval for first purchase: true\n- Require user approval for sales: true\n`);
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: ETF\n\n## Snapshot\n- Holdings health: healthy\n`);
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: ETF\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n${trades}`);
  fs.writeFileSync(path.join(tempDir, 'runtime', 'execution-state.json'), JSON.stringify(state, null, 2));
  return { tempDir, portfolioDir };
}

function loadModules(readiness, runtimeState = { brokerErrors: {}, liveExecutionArms: {} }) {
  const original = Module._load;
  delete require.cache[readinessTarget];
  delete require.cache[authorityTarget];
  const clonedState = JSON.parse(JSON.stringify(runtimeState));
  clonedState.liveExecutionArms ||= {};
  clonedState.brokerErrors ||= {};
  Module._load = function(request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return { getInteractiveBrokersReadiness: async () => readiness };
    }
    if (request.endsWith('./runtimeState') || request === './runtimeState') {
      return {
        readExecutionState: () => clonedState,
        writeExecutionState: (next) => {
          clonedState.brokerErrors = next.brokerErrors || {};
          clonedState.liveExecutionArms = next.liveExecutionArms || {};
          return 'mock-runtime-state';
        },
        brokerErrorStatus: (portfolio, threshold = 3) => {
          const bucket = clonedState.brokerErrors?.[portfolio] || { consecutive: 0 };
          return {
            consecutive: Number(bucket.consecutive || 0),
            lastReason: bucket.lastReason || null,
            lastMessage: bucket.lastMessage || null,
            lastAt: bucket.lastAt || null,
            stopAutomation: Number(bucket.consecutive || 0) >= threshold,
            threshold,
          };
        },
      };
    }
    return original.apply(this, arguments);
  };
  try {
    return {
      readiness: require(readinessTarget),
      authority: require(authorityTarget),
    };
  } finally {
    Module._load = original;
  }
}

(async () => {
  const cwd = process.cwd();

  {
    const { tempDir, portfolioDir } = createPortfolioFixture({
      trades: '| 2026-05-10 09:00:00 | proposed | buy | AAA | ETF A | 1 | 100 | 100 | 0 | proposed row | pending_user_approval |  |  |  |  |  |\n',
      state: { liveExecutionArms: { etf: { armedAt: '2026-05-10T08:00:00Z', expiresAt: '2099-05-10T18:00:00Z', note: 'armed' } } },
    });
    process.chdir(tempDir);
    saveApprovalEnvelope({
      approvalId: 'basket-001',
      portfolio: 'etf',
      createdAt: '2026-05-10T10:00:00Z',
      expiresAt: '2099-05-10T18:00:00Z',
      summary: 'Approved ETF basket',
      executionPolicy: { continueOnIndependentFailure: true, requireCompactReapprovalOnPriceDrift: true, substitutionAllowed: false },
      legs: [
        { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8', conid: '75776072', action: 'BUY', quantity: 2, limitPrice: 689.2, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', maxAttempts: 1, retryPolicy: 'none', status: 'approved' },
      ],
    }, { rootDir: tempDir, now: new Date('2026-05-10T11:00:00Z') });
    const mod = loadModules({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, message: 'ready' });
    const result = await mod.readiness.evaluateLiveReadinessPreflight({ portfolioDir, now: new Date('2026-05-10T11:00:00Z') });
    assert.strictEqual(result.blockers.some((b) => b.code === 'no_approved_rows'), false, JSON.stringify(result.blockers));
    assert.strictEqual(result.blockers.some((b) => b.code === 'no_executable_rows'), false, JSON.stringify(result.blockers));
    assert.strictEqual(result.approvalState.hasExecutableApprovedBasket, true);
    assert.strictEqual(result.approvalState.basketApprovalState.approvedCount, 1);
    assert.strictEqual(result.approvalState.basketApprovalState.executableCount, 1);
    assert.strictEqual(result.approvalState.basketApprovalState.hasExecutableApprovedBasket, true);
    process.chdir(cwd);
  }

  {
    const { tempDir, portfolioDir } = createPortfolioFixture({
      trades: '| 2026-05-10 09:00:00 | proposed | buy | AAA | ETF A | 1 | 100 | 100 | 0 | proposed row | pending_user_approval |  |  |  |  |  |\n',
      state: { liveExecutionArms: { etf: { armedAt: '2026-05-10T08:00:00Z', expiresAt: '2099-05-10T18:00:00Z', note: 'armed' } } },
    });
    process.chdir(tempDir);
    const mod = loadModules({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, message: 'ready' });
    const result = await mod.readiness.evaluateLiveReadinessPreflight({ portfolioDir, now: new Date('2026-05-10T11:00:00Z') });
    assert(result.blockers.some((b) => b.code === 'no_approved_rows'));
    assert(result.blockers.some((b) => b.code === 'no_executable_rows'));
    process.chdir(cwd);
  }

  {
    const { tempDir, portfolioDir } = createPortfolioFixture({
      trades: '',
      state: { liveExecutionArms: { etf: { armedAt: '2026-05-10T08:00:00Z', expiresAt: '2099-05-10T18:00:00Z', note: 'armed' } } },
    });
    process.chdir(tempDir);
    saveApprovalEnvelope({
      approvalId: 'basket-002',
      portfolio: 'etf',
      createdAt: '2026-05-10T10:00:00Z',
      expiresAt: '2099-05-10T18:00:00Z',
      summary: 'Approved ETF basket',
      executionPolicy: { continueOnIndependentFailure: true, requireCompactReapprovalOnPriceDrift: true, substitutionAllowed: false },
      legs: [
        { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8', conid: '75776072', action: 'BUY', quantity: 2, limitPrice: 689.2, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', maxAttempts: 1, retryPolicy: 'none', status: 'approved' },
      ],
    }, { rootDir: tempDir, now: new Date('2026-05-10T11:00:00Z') });
    const mod = loadModules({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, message: 'ready' });
    const authority = await mod.authority.evaluateExecutionAuthority({ portfolioDir });
    assert.strictEqual(authority.effectiveAuthority.liveExecutionPossibleNow, true);
    assert.strictEqual(authority.effectiveAuthority.requiresExplicitOperatorAction, false);
    process.chdir(cwd);
  }

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
