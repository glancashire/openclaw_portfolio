const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const Module = require('module');

const repoRoot = path.resolve(__dirname, '..');
const portfolioDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage-timing-policy-'));
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: Test\n- Status: active\n- Execution mode: transmitted_live\n- Broker account reference: TEST123\n\n## Approved Instruments\n| ISIN / Ticker | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | Global equities | 40 | 30 | 50 | IBIS / SMART | EUR | ibkr_symbol=UBSPX; ibkr_local_symbol=BCFT; ibkr_conid=808613958; ibkr_primary_exchange=IBIS; fx_to_chf=0.96 |\n\n## Excluded Instruments\n| ISIN / Ticker | Reason |\n|---|---|\n| none | |\n\n## Delivery Policy\n- Delivery mode: local_only\n`);
fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: Test\n\n- Date/time: 2026-05-20 00:00:00\n- Total value CHF: 10000\n- Invested value CHF: 7000\n- Cash CHF: 3000\n- Unmatched holdings: none\n- Pricing source: broker_api\n\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Last price | Market value CHF | Allocation % | Cost basis CHF | Unrealized P/L CHF | Notes |\n|---|---|---:|---:|---:|---:|---:|---:|---|\n`);
fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: Test\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n`);
fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: Test\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-20 | end_of_day | 10000 | 7000 | 3000 | 0 | 0 | test |\n`);

let capturedOrder = null;
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '../brokers/interactive-brokers/client') {
    return {
      InteractiveBrokersClient: class {
        async placeOrder(order) {
          capturedOrder = { ...order };
          return {
            ok: true,
            dryRun: true,
            mode: 'read_only_preview',
            order: { orderId: null, status: 'simulated', transmit: false, quantity: order.quantity, limitPrice: order.limitPrice, currency: order.currency, symbol: order.symbol, identifier: order.conid },
            quote: { referencePrice: order.limitPrice, estimatedValue: Number(order.quantity) * Number(order.limitPrice), currency: order.currency },
          };
        }
      },
    };
  }
  if (request === '../brokers/interactive-brokers/readiness') {
    return { getInteractiveBrokersReadiness: async () => ({ configured: true, authenticated: true, reachable: true, mode: 'native-socket', fallbackRequired: false, marketDataMode: 'live_or_realtime', reason: 'ready', guidance: 'Broker path is healthy.', message: 'ok' }) };
  }
  if (request === '../validation/safetyControls') return { evaluateSafetyControls: () => ({ blockers: [] }) };
  if (request === '../analysis/tradeLogWriter') return { appendTradeProposals: () => ({ appended: 0, skipped: 'dry_run_no_trade_log_write' }) };
  if (request === '../analysis/historyWriter') return { appendHistorySnapshot: () => ({ appended: false, skipped: 'dry_run_no_history_write' }) };
  if (request === '../reporting/dashboardGenerator') return { regenerateDashboard: async () => null };
  if (request === '../brokers/interactive-brokers/holdingsSync') return { syncInteractiveBrokersHoldings: async () => ({ ok: true }) };
  if (request === './runtimeState') return { recordBrokerError: () => ({}), clearBrokerErrors: () => {}, brokerErrorStatus: () => ({ consecutive: 0, stopAutomation: false }) };
  if (request === '../observability/runtimeEvents') return { recordRuntimeEvent: () => {} };
  return originalLoad(request, parent, isMain);
};

const { stagePortfolioOrder } = require('../src/execution/portfolioExecution');

(async () => {
  const result = await stagePortfolioOrder({
    portfolioDir,
    order: { symbol: 'UBSPX', conid: '808613958', primaryExchange: 'IBIS', exchange: 'SMART', currency: 'EUR', action: 'BUY', quantity: 8, limitPrice: 122.845 },
    dryRun: true,
    revocableOnly: true,
    transmitLive: false,
  });
  assert.strictEqual(result.ok, true);
  assert(capturedOrder, 'expected captured order');
  assert.strictEqual(capturedOrder.tif, 'DAY');
  assert.strictEqual(capturedOrder.outsideRth, false);
  assert.strictEqual(capturedOrder.goodAfterTime, '20260521 09:00:00 MET');
  assert.strictEqual(result.tradeAppend.skipped, 'dry_run_no_trade_log_write');
  assert.strictEqual(result.historyAppend.skipped, 'dry_run_no_history_write');
  console.log(JSON.stringify({ ok: true, capturedOrder }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
