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
 *
 * Updated Phase 1 (2026-06-02): lifecycle no longer calls notifyTradeFill
 * directly — it defers to the post-resync path. Trade objects are still
 * normalized and exposed via notifyResults[].trade for verification.
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

  const { runBasketLifecycle } = require(path.join(realRoot, 'src/execution/basketLifecycle'));

  const result = await runBasketLifecycle({
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
      notifyTradeFill: async () => ({ attempted: false, sent: false, reason: 'stub' }),
      resyncHoldings: async () => 'noop',
    },
  });

  // Phase 1: lifecycle defers investor email — trade objects exposed via notifyResults[].trade
  assert.strictEqual(result.notifyResults.length, 2, `expected 2 fill records, got ${result.notifyResults.length}`);

  const t1 = result.notifyResults.find((r) => r.trade && r.trade.symbol === 'SXR8');
  assert(t1, 'missing SXR8 trade record');
  assert.strictEqual(t1.trade.action, 'BUY',   `SXR8 action must be normalised to 'BUY' (was ${t1.trade.action})`);
  assert.strictEqual(t1.trade.currency, 'EUR', `SXR8 currency must be hydrated to 'EUR' from proposal (was ${t1.trade.currency})`);
  assert.strictEqual(t1.trade.fillQty, 12);

  const t2 = result.notifyResults.find((r) => r.trade && r.trade.symbol === 'SPMCHA');
  assert(t2, 'missing SPMCHA trade record');
  assert.strictEqual(t2.trade.action, 'BUY',   `SPMCHA action must be normalised to 'BUY' (was ${t2.trade.action})`);
  assert.strictEqual(t2.trade.currency, 'CHF', `SPMCHA currency should remain 'CHF' (was ${t2.trade.currency})`);

  console.log(JSON.stringify({ ok: true, asserted: 6 }));
})().catch((err) => { console.error(err.stack || String(err)); process.exit(1); });
