const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const Module = require('module');

const portfolioDir = fs.mkdtempSync(path.join(os.tmpdir(), 'probable-cancelled-strong-'));
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: Test\n\n## Approved Instruments\n| ISIN / Ticker | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | Global equities | 40 | 30 | 50 | IBIS / SMART | EUR | ibkr_symbol=UBSPX; ibkr_local_symbol=BCFT; ibkr_conid=808613958; ibkr_primary_exchange=IBIS; fx_to_chf=0.96 |\n`);
fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-20 15:50:11 | submitted | buy | IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | 8 | 122.845 | 984.28 | 0 | Portfolio-approved transmitted live broker order submitted. | submitted_to_broker | 9113 |\n`);
fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: Test\n\n## Daily Valuation History\n\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-20 | end_of_day | 5000 | 0 | 5000 | 0 | 0 | test |\n`);
fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: Test\n\n- Date/time: 2026-05-20 00:00:00\n- Total value CHF: 5000\n- Invested value CHF: 0\n- Cash CHF: 5000\n\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Last price | Market value CHF | Allocation % | Cost basis CHF | Unrealized P/L CHF | Notes |\n|---|---|---:|---:|---:|---:|---:|---:|---|\n`);

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '../brokers/interactive-brokers/client') {
    return {
      InteractiveBrokersClient: class {
        async getOrderStatus() {
          return {
            ok: false,
            reason: 'not_found',
            orderId: 9113,
            message: 'No exact broker order id match was found, but completed-order hints are available.',
            hints: { completedOrders: [{ orderId: 0, permId: 1937911602, symbol: 'UBSPX', status: 'Cancelled', quantity: 8, action: 'BUY' }] },
          };
        }
      },
    };
  }
  if (request === '../reporting/dashboardGenerator') return { regenerateDashboard: async () => ({ ok: true }) };
  if (request === '../brokers/interactive-brokers/holdingsSync') return { syncInteractiveBrokersHoldings: async () => ({ ok: true }) };
  if (request === '../execution/runtimeState') {
    return {
      recordBrokerError: () => ({ consecutive: 1 }),
      clearBrokerErrors: () => {},
      brokerErrorStatus: () => ({ consecutive: 0, stopAutomation: false }),
    };
  }
  if (request === '../observability/runtimeEvents') return { recordRuntimeEvent: () => {} };
  return originalLoad(request, parent, isMain);
};

const { syncPortfolioOrderStatus } = require('../src/execution/portfolioExecution');
const { readTradesTable } = require('../src/execution/tradeState');

(async () => {
  const result = await syncPortfolioOrderStatus({ portfolioDir, orderId: 9113, selector: { orderId: 9113, tickerOrIsin: 'IE00BD4TXW66', action: 'buy' }, refreshHoldingsOnFill: false });
  const row = readTradesTable(path.join(portfolioDir, 'trades.md')).rows[0];
  assert.strictEqual(result.reason, 'probable_cancelled');
  assert.strictEqual(row.Status, 'cancelled');
  assert.strictEqual(row.Approval, 'broker_cancelled');
  console.log(JSON.stringify({ ok: true, result, row }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
