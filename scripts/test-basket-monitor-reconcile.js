'use strict';

/* Phase 188 unit tests for reconcileBasketRunFromBroker + classifyBrokerOutcome. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { saveApprovalEnvelope } = require('../src/execution/basketApprovalStore');
const {
  executeApprovedBasket,
  reconcileBasketRunFromBroker,
  classifyBrokerOutcome,
  runPath,
} = require('../src/execution/basketExecutionRunner');

(async () => {
  // -------- Unit: classifyBrokerOutcome --------
  const filled = classifyBrokerOutcome({
    orderId: 9001,
    executions: [
      { orderId: 9001, shares: 10, price: 100, execId: 'e-1' },
      { orderId: 9001, shares: 6, price: 101, execId: 'e-2' },
      { orderId: 9999, shares: 3, price: 5, execId: 'e-3' },
    ],
  });
  assert.strictEqual(filled.status, 'filled');
  assert.strictEqual(filled.fillQuantity, 16);
  assert.strictEqual(filled.avgFillPrice, 100.375);
  assert.deepStrictEqual(filled.executionIds, ['e-1', 'e-2']);

  const cancelled = classifyBrokerOutcome({
    orderId: 9002,
    executions: [],
    completedOrders: [
      { orderId: 9991, symbol: 'OTHER', status: 'Cancelled', completedStatus: 'ApiCancelled' },
      { orderId: 9002, symbol: 'SPMCHA', status: 'Cancelled', completedStatus: 'PendingCancel' },
    ],
  });
  assert.strictEqual(cancelled.status, 'cancelled');
  assert.strictEqual(cancelled.cancelledReason, 'PendingCancel');

  const unknown = classifyBrokerOutcome({
    orderId: 9003,
    executions: [],
    completedOrders: [{ orderId: 9002, symbol: 'SPMCHA', status: 'Cancelled', completedStatus: 'PendingCancel' }],
  });
  assert.strictEqual(unknown.status, 'unknown');

  // -------- Integration: reconcile a runs artifact --------
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase188-'));
  const portfolioDir = path.join(dir, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: ETF\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n');

  saveApprovalEnvelope({
    approvalId: 'basket-188',
    portfolio: 'etf',
    createdAt: '2026-05-22T10:00:00Z',
    expiresAt: '2099-05-22T22:00:00Z',
    legs: [
      { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8',  conid: '75776072',  action: 'BUY', quantity: 16, limitPrice: 692.5, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', maxAttempts: 1 },
      { legId: 'leg-2', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', conid: '91639399', action: 'BUY', quantity: 19, limitPrice: 129.0, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS',   maxAttempts: 1 },
    ],
  }, { rootDir: dir });

  let nextId = 9100;
  await executeApprovedBasket({
    portfolioDir,
    approvalId: 'basket-188',
    rootDir: dir,
    now: new Date('2026-05-22T10:01:00Z'),
    submitLeg: async () => ({ ok: true, brokerResult: { order: { orderId: ++nextId, status: 'PreSubmitted' } } }),
  });

  const stateBefore = JSON.parse(fs.readFileSync(runPath({ portfolio: 'etf', approvalId: 'basket-188', rootDir: dir }), 'utf8'));
  assert.strictEqual(stateBefore.legs['leg-1'].status, 'submitted');
  assert.strictEqual(stateBefore.legs['leg-2'].status, 'submitted');

  const out = reconcileBasketRunFromBroker({
    portfolio: 'etf',
    approvalId: 'basket-188',
    rootDir: dir,
    executions: [
      { orderId: 9101, shares: 16, price: 691.04, execId: 'x-9101' },
    ],
    completedOrders: [
      { orderId: 9102, symbol: 'SPMCHA', status: 'Cancelled', completedStatus: 'Cancelled' },
    ],
    now: new Date('2026-05-22T10:50:00Z'),
  });
  assert(fs.existsSync(out));

  const stateAfter = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.strictEqual(stateAfter.legs['leg-1'].status, 'filled');
  assert.strictEqual(stateAfter.legs['leg-1'].fillQuantity, 16);
  assert.strictEqual(stateAfter.legs['leg-1'].avgFillPrice, 691.04);
  assert.strictEqual(stateAfter.legs['leg-2'].status, 'cancelled');
  assert.strictEqual(stateAfter.summary.filled, 1);
  assert.strictEqual(stateAfter.summary.cancelled, 1);
  assert.strictEqual(stateAfter.status, 'partial');

  // -------- Regression: reconciling a leg already in terminal state is a no-op for that leg --------
  const out2 = reconcileBasketRunFromBroker({
    portfolio: 'etf',
    approvalId: 'basket-188',
    rootDir: dir,
    executions: [{ orderId: 9101, shares: 99, price: 1, execId: 'noop' }],
    completedOrders: [],
    now: new Date('2026-05-22T11:00:00Z'),
  });
  const stateAgain = JSON.parse(fs.readFileSync(out2, 'utf8'));
  assert.strictEqual(stateAgain.legs['leg-1'].fillQuantity, 16, 'terminal leg should not be re-classified');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
