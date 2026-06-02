'use strict';

/* Phase 192 — basket lifecycle helper tests (no live broker). */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lifecycle-'));
  // Mirror real layout: src/execution, scripts, etc. We point to live source from this clone.
  const realRoot = path.resolve(__dirname, '..');
  // Symlink src and lib so the lifecycle helper can resolve notifyTradeFill via path.
  fs.symlinkSync(path.join(realRoot, 'src'), path.join(root, 'src'));
  fs.symlinkSync(path.join(realRoot, 'lib'), path.join(root, 'lib'));
  fs.symlinkSync(path.join(realRoot, 'skills'), path.join(root, 'skills'));

  const portfolioDir = path.join(root, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n');

  // Seed a basket-runs artifact (3 filled, 1 cancelled) and a matching approved-baskets envelope.
  const runsDir = path.join(root, 'runtime', 'basket-runs', 'etf');
  const approvedDir = path.join(root, 'runtime', 'approved-order-baskets', 'etf');
  fs.mkdirSync(runsDir, { recursive: true });
  fs.mkdirSync(approvedDir, { recursive: true });

  const approvalId = 'basket-etf-lifecycle-test';
  const runState = {
    schemaVersion: '1.0',
    portfolio: 'etf',
    approvalId,
    status: 'partial',
    legs: {
      'leg-1': { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8',  status: 'submitted', brokerOrderId: 9124 },
      'leg-2': { legId: 'leg-2', instrument: 'LU0950668870', ibkrSymbol: 'EMUAA', status: 'submitted', brokerOrderId: 9125 },
      'leg-3': { legId: 'leg-3', instrument: 'CH0032912732', ibkrSymbol: 'CHSPI', status: 'submitted', brokerOrderId: 9126 },
      'leg-4': { legId: 'leg-4', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', status: 'submitted', brokerOrderId: 9127 },
    },
    summary: { total: 4, executed: 0, blocked: 0, failed: 0, submitted: 4, filled: 0, cancelled: 0 },
  };
  fs.writeFileSync(path.join(runsDir, `${approvalId}.json`), JSON.stringify(runState, null, 2));
  fs.writeFileSync(path.join(approvedDir, `${approvalId}.json`), JSON.stringify({
    schemaVersion: '1.0',
    approvalId,
    portfolio: 'etf',
    legs: [
      { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8',   conid: '75776072',  action: 'BUY', quantity: 16, limitPrice: 692.50, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', status: 'approved' },
      { legId: 'leg-2', instrument: 'LU0950668870', ibkrSymbol: 'EMUAA',  conid: '243939970', action: 'BUY', quantity: 6,  limitPrice: 40.85,  currency: 'EUR', exchange: 'SMART', primaryExchange: null,    status: 'approved' },
      { legId: 'leg-3', instrument: 'CH0032912732', ibkrSymbol: 'CHSPI',  conid: '150029461', action: 'BUY', quantity: 7,  limitPrice: 162.50, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS',   status: 'approved' },
      { legId: 'leg-4', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', conid: '91639399',  action: 'BUY', quantity: 19, limitPrice: 129.00, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS',   status: 'approved' },
    ],
  }, null, 2));

  const { runBasketLifecycle } = require(path.join(realRoot, 'src/execution/basketLifecycle'));

  const messages = [];
  const fakeNotify = async () => ({ attempted: true, sent: true, result: { id: 'mock' } });
  const fakeResync = async () => 'resync-stub';
  const fakeClient = {
    native: {
      fetchOpenOrders: async () => [],
      fetchMarketSnapshot: async (conids) => conids.map((c) => ({ conid: c, ask: NaN, bid: NaN, last: 128.50, close: 128.50 })),
    },
    cancelOrder: async (id) => ({ cancel: { orderId: id, status: 'cancelled' } }),
  };

  const ibkrJsonStub = (cmd) => {
    if (cmd === 'executions') {
      return [
        { orderId: 9124, symbol: 'SXR8',  side: 'BOT', shares: 16, price: 691.04, currency: 'EUR' },
        { orderId: 9125, symbol: 'EMUAA', side: 'BOT', shares: 6,  price: 40.74,  currency: 'EUR' },
        { orderId: 9126, symbol: 'CHSPI', side: 'BOT', shares: 7,  price: 161.88, currency: 'CHF' },
      ];
    }
    if (cmd === 'completed-orders') {
      return [
        { orderId: 9127, symbol: 'SPMCHA', status: 'Cancelled', filledQty: 0, qty: 19 },
      ];
    }
    return null;
  };

  const result = await runBasketLifecycle({
    portfolio: 'etf',
    approvalId,
    rootDir: root,
    portfolioDir,
    client: fakeClient,
    runState,
    options: {
      skipMonitor: true,
      logger: (m) => messages.push(m),
      ibkrJson: ibkrJsonStub,
      notifyTradeFill: fakeNotify,
      resyncHoldings: fakeResync,
    },
  });

  assert.strictEqual(result.cancelledLegCount, 1, 'lifecycle should find one cancelled leg');
  assert.strictEqual(result.reconciled.summary.filled, 3);
  assert.strictEqual(result.reconciled.summary.cancelled, 1);
  assert.strictEqual(result.mirror.appended, 4, 'mirror should append 3 filled + 1 cancelled = 4 rows');
  assert.strictEqual(result.notifyResults.length, 3, 'should record exactly 3 fills');
  assert(result.notifyResults.every((r) => r.ok), 'all fill records should be ok');
  assert(result.notifyResults.every((r) => r.result.reason === 'deferred_to_post_resync'), 'fills should be deferred to post-resync path');
  assert(result.reproposal && !result.reproposal.skipped, 'reproposal should be built');
  assert.strictEqual(result.reproposal.envelope.legs.length, 1, 'reproposal should contain only the cancelled leg');
  assert(result.reproposal.envelope.legs[0].limitPrice > 129.00, 'reproposal limit must exceed previous 129.00');

  const trades = fs.readFileSync(path.join(portfolioDir, 'trades.md'), 'utf8');
  assert(trades.includes('| filled |'), 'trades.md should contain filled rows');
  assert(trades.includes('| cancelled |'), 'trades.md should contain cancelled row');
  assert(trades.includes('9124'), 'trades.md should reference broker order id 9124');

  // Idempotency: second invocation should not duplicate trade rows or re-notify.
  const result2 = await runBasketLifecycle({
    portfolio: 'etf',
    approvalId,
    rootDir: root,
    portfolioDir,
    client: fakeClient,
    runState: result.reconciled,
    options: {
      skipMonitor: true,
      logger: () => {},
      ibkrJson: ibkrJsonStub,
      notifyTradeFill: fakeNotify,
      resyncHoldings: fakeResync,
    },
  });
  assert.strictEqual(result2.mirror.appended, 0, 'second run must not duplicate rows');
  assert.strictEqual(result2.notifyResults.length, 0, 'second run must not duplicate fill records');

  // Regression: when skipMonitor=false and brokerOrderIds is empty, lifecycle must not throw
  const emptyRun = { legs: {} };
  const result3 = await runBasketLifecycle({
    portfolio: 'etf',
    approvalId,
    rootDir: root,
    portfolioDir,
    client: fakeClient,
    runState: emptyRun,
    options: {
      skipMonitor: false,
      logger: () => {},
      ibkrJson: () => [],
      notifyTradeFill: fakeNotify,
      resyncHoldings: fakeResync,
    },
  });
  assert.strictEqual(result3.brokerOrderIds.length, 0);

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
