'use strict';

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
  const cancelled = classifyBrokerOutcome({
    orderId: 9140,
    completedOrders: [
      { orderId: 0, permId: 12345, symbol: 'CEBL', status: 'Cancelled', quantity: 11 },
    ],
    leg: { instrument: 'IE00B5L8K969', ibkrSymbol: 'CEBL', quantity: 11, action: 'BUY' },
  });
  assert.strictEqual(cancelled.status, 'cancelled');
  assert.strictEqual(cancelled.cancelledReason, 'Cancelled');

  const unknown = classifyBrokerOutcome({
    orderId: 9141,
    completedOrders: [
      { orderId: 0, permId: 12345, symbol: 'CEBL', status: 'Cancelled', quantity: 12 },
    ],
    leg: { instrument: 'IE00B5L8K969', ibkrSymbol: 'CEBL', quantity: 11, action: 'BUY' },
  });
  assert.strictEqual(unknown.status, 'unknown');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-r6-'));
  const portfolioDir = path.join(dir, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: ETF\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n');

  saveApprovalEnvelope({
    approvalId: 'basket-r6',
    portfolio: 'etf',
    createdAt: '2026-05-28T13:00:00Z',
    expiresAt: '2099-05-28T22:00:00Z',
    legs: [
      { legId: 'leg-1', instrument: 'IE00B5L8K969', ibkrSymbol: 'CEBL', conid: '123', action: 'BUY', quantity: 11, limitPrice: 33.0, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', maxAttempts: 1 },
      { legId: 'leg-2', instrument: 'CH0032912732', ibkrSymbol: 'CHSPI', conid: '456', action: 'BUY', quantity: 8, limitPrice: 120.0, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS', maxAttempts: 1 },
    ],
  }, { rootDir: dir, kind: 'proposal' });
  saveApprovalEnvelope({
    approvalId: 'basket-r6',
    portfolio: 'etf',
    createdAt: '2026-05-28T13:00:00Z',
    expiresAt: '2099-05-28T22:00:00Z',
    legs: [
      { legId: 'leg-1', instrument: 'IE00B5L8K969', ibkrSymbol: 'CEBL', conid: '123', action: 'BUY', quantity: 11, limitPrice: 33.0, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', maxAttempts: 1, status: 'approved' },
      { legId: 'leg-2', instrument: 'CH0032912732', ibkrSymbol: 'CHSPI', conid: '456', action: 'BUY', quantity: 8, limitPrice: 120.0, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS', maxAttempts: 1, status: 'approved' },
    ],
  }, { rootDir: dir });

  let nextId = 9139;
  await executeApprovedBasket({
    portfolioDir,
    approvalId: 'basket-r6',
    rootDir: dir,
    now: new Date('2026-05-28T13:01:00Z'),
    submitLeg: async () => ({ ok: true, brokerResult: { order: { orderId: ++nextId, status: 'PreSubmitted' } } }),
  });

  const out = reconcileBasketRunFromBroker({
    portfolio: 'etf',
    approvalId: 'basket-r6',
    rootDir: dir,
    executions: [],
    completedOrders: [
      { orderId: 0, permId: 991, symbol: 'CEBL', status: 'Cancelled', quantity: 11 },
      { orderId: 0, permId: 992, symbol: 'CHSPI', status: 'Cancelled', quantity: 9 },
    ],
    now: new Date('2026-05-28T13:10:00Z'),
  });

  const stateAfter = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.strictEqual(stateAfter.legs['leg-1'].status, 'cancelled');
  assert.strictEqual(stateAfter.legs['leg-2'].status, 'submitted');
  assert.strictEqual(stateAfter.summary.cancelled, 1);
  assert.strictEqual(stateAfter.summary.submitted, 1);
  assert.strictEqual(stateAfter.status, 'submitted');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
