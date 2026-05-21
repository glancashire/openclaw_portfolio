const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { saveApprovalEnvelope } = require('../src/execution/basketApprovalStore');
const { executeApprovedBasket, legEligible, loadOrCreateRunState } = require('../src/execution/basketExecutionRunner');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'basket-runner-'));
  const portfolioDir = path.join(dir, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: ETF\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n');

  saveApprovalEnvelope({
    approvalId: 'basket-183c',
    portfolio: 'etf',
    createdAt: '2026-05-21T22:00:00Z',
    expiresAt: '2099-05-21T22:00:00Z',
    legs: [
      { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8', conid: '75776072', action: 'BUY', quantity: 2, limitPrice: 689.2, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', maxAttempts: 2 },
      { legId: 'leg-2', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', conid: '91639399', action: 'BUY', quantity: 18, limitPrice: 129.5, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS', maxAttempts: 1 },
      { legId: 'leg-3', instrument: 'LU0950668870', ibkrSymbol: 'EMUAA', conid: '243939970', action: 'BUY', quantity: 14, limitPrice: 40.9, currency: 'EUR', exchange: 'SMART', primaryExchange: 'XETRA', maxAttempts: 1 },
    ],
  }, { rootDir: dir });

  const firstLeg = legEligible({ legId: 'leg-1', status: 'approved', maxAttempts: 2 }, { legs: {} });
  assert.strictEqual(firstLeg.ok, true);

  const capped = legEligible({ legId: 'leg-2', status: 'approved', maxAttempts: 1 }, { legs: { 'leg-2': { attempts: 1 } } });
  assert.strictEqual(capped.ok, false);
  assert.strictEqual(capped.code, 'attempt_limit_reached');

  const result = await executeApprovedBasket({
    portfolioDir,
    approvalId: 'basket-183c',
    rootDir: dir,
    now: new Date('2026-05-21T22:50:00Z'),
    submitLeg: async ({ leg }) => {
      if (leg.legId === 'leg-2') return { ok: false, reason: 'policy_blocked' };
      if (leg.legId === 'leg-3') return { ok: false, reason: 'broker_error', error: 'contract failed' };
      return { ok: true, brokerResult: { order: { orderId: 9124, status: 'PreSubmitted' } } };
    },
  });

  assert(fs.existsSync(result.path));
  assert.strictEqual(result.runState.legs['leg-1'].status, 'submitted');
  assert.strictEqual(result.runState.legs['leg-2'].status, 'blocked');
  assert.strictEqual(result.runState.legs['leg-3'].status, 'failed');
  assert.strictEqual(result.runState.summary.executed, 1);
  assert.strictEqual(result.runState.summary.blocked, 1);
  assert.strictEqual(result.runState.summary.failed, 1);
  assert.strictEqual(result.runState.status, 'partial');

  const loaded = loadOrCreateRunState({ portfolio: 'etf', approvalId: 'basket-183c', rootDir: dir, now: new Date('2026-05-21T22:50:00Z') });
  assert.strictEqual(loaded.state.legs['leg-1'].attempts, 1);

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
