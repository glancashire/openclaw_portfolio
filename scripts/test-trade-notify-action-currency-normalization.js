#!/usr/bin/env node
'use strict';

/*
 * Regression: basketLifecycle must normalise IBKR exec side ('BOT'/'SLD') to
 * canonical action ('BUY'/'SELL') and hydrate native currency from the proposal
 * envelope when the exec row drops it.
 *
 * Bug 2026-05-26: fill confirmations went out with subject 'BOT 12 SXR8 filled
 * @ 694.9 CHF' (action=BOT, currency=CHF instead of EUR) because the
 * basketLifecycle notify path consumed raw exec.side and defaulted currency
 * to CHF when the broker dropped it.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const realRoot = path.resolve(__dirname, '..');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tradenorm-'));
  fs.symlinkSync(path.join(realRoot, 'src'),  path.join(root, 'src'));
  fs.symlinkSync(path.join(realRoot, 'lib'),  path.join(root, 'lib'));
  fs.symlinkSync(path.join(realRoot, 'skills'), path.join(root, 'skills'));

  const portfolioDir = path.join(root, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'),
    '# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n');

  const approvalId = 'basket-etf-tradenorm-test';

  // Seed proposal envelope (has canonical action='BUY' and native currency='EUR' for SXR8 / 'CHF' for SPMCHA)
  const proposalsDir = path.join(root, 'runtime', 'basket-proposals', 'etf');
  fs.mkdirSync(proposalsDir, { recursive: true });
  fs.writeFileSync(path.join(proposalsDir, `${approvalId}.json`), JSON.stringify({
    schemaVersion: '1.0',
    approvalId,
    portfolio: 'etf',
    legs: [
      { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8',  action: 'BUY', currency: 'EUR', conid: 75776072, quantity: 12, limitPrice: 698.24, exchange: 'SMART', primaryExchange: 'IBIS2' },
      { legId: 'leg-2', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', action: 'BUY', currency: 'CHF', conid: 91639399, quantity: 32, limitPrice: 129.65, exchange: 'SMART', primaryExchange: 'EBS' },
    ],
  }, null, 2));

  // Seed approved-baskets envelope (lifecycle wants this present so reproposal-on-cancel can run if needed)
  const approvedDir = path.join(root, 'runtime', 'approved-order-baskets', 'etf');
  fs.mkdirSync(approvedDir, { recursive: true });
  fs.writeFileSync(path.join(approvedDir, `${approvalId}.json`), JSON.stringify({
    schemaVersion: '1.0',
    portfolio: 'etf',
    approvalId,
    legs: [
      { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8',  conid: '75776072', action: 'BUY', quantity: 12, limitPrice: 698.24, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', status: 'approved' },
      { legId: 'leg-2', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', conid: '91639399', action: 'BUY', quantity: 32, limitPrice: 129.65, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS', status: 'approved' },
    ],
  }, null, 2));

  const runState = {
    schemaVersion: '1.0',
    portfolio: 'etf',
    approvalId,
    status: 'submitted',
    legs: {
      'leg-1': { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8',   status: 'submitted', brokerOrderId: 9130 },
      'leg-2': { legId: 'leg-2', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', status: 'submitted', brokerOrderId: 9131 },
    },
  };

  // Seed the runs artifact too (reconcile expects it on disk).
  const runsDir = path.join(root, 'runtime', 'basket-runs', 'etf');
  fs.mkdirSync(runsDir, { recursive: true });
  fs.writeFileSync(path.join(runsDir, `${approvalId}.json`), JSON.stringify(runState, null, 2));

  const fakeClient = {
    native: {
      fetchOpenOrders: async () => [],
      fetchMarketSnapshot: async () => [],
    },
    cancelOrder: async (id) => ({ cancel: { orderId: id, status: 'cancelled' } }),
  };

  // Simulate raw IBKR exec rows: side='BOT' (not 'BUY'), currency missing on first row.
  const ibkrJsonStub = (cmd) => {
    if (cmd === 'executions') {
      return [
        { orderId: 9130, symbol: 'SXR8',   side: 'BOT', shares: 12, price: 694.90 },                  // currency dropped — proposal must hydrate to EUR
        { orderId: 9131, symbol: 'SPMCHA', side: 'BOT', shares: 32, price: 129.10, currency: 'CHF' },
      ];
    }
    if (cmd === 'completed-orders') return [];
    return null;
  };

  const captured = [];
  const fakeNotify = async ({ trade }) => {
    captured.push(trade);
    return { attempted: true, sent: true, result: { id: 'mock' } };
  };

  const { runBasketLifecycle } = require(path.join(realRoot, 'src/execution/basketLifecycle'));

  await runBasketLifecycle({
    portfolio: 'etf',
    approvalId,
    rootDir: root,
    portfolioDir,
    client: fakeClient,
    runState,
    options: {
      skipMonitor: true,
      logger: () => {},
      ibkrJson: ibkrJsonStub,
      notifyTradeFill: fakeNotify,
      resyncHoldings: async () => 'noop',
    },
  });

  assert.strictEqual(captured.length, 2, `expected 2 trade notifications, got ${captured.length}`);

  const t1 = captured.find((t) => t.symbol === 'SXR8');
  assert(t1, 'missing SXR8 trade notification');
  assert.strictEqual(t1.action, 'BUY',   `SXR8 action must be normalised to 'BUY' (was ${t1.action})`);
  assert.strictEqual(t1.currency, 'EUR', `SXR8 currency must be hydrated to 'EUR' from proposal (was ${t1.currency})`);
  assert.strictEqual(t1.fillQty, 12);

  const t2 = captured.find((t) => t.symbol === 'SPMCHA');
  assert(t2, 'missing SPMCHA trade notification');
  assert.strictEqual(t2.action, 'BUY',   `SPMCHA action must be normalised to 'BUY' (was ${t2.action})`);
  assert.strictEqual(t2.currency, 'CHF', `SPMCHA currency should remain 'CHF' (was ${t2.currency})`);

  console.log(JSON.stringify({ ok: true, asserted: 6 }));
})().catch((err) => { console.error(err.stack || String(err)); process.exit(1); });
