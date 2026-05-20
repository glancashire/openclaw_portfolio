const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const Module = require('module');

const portfolioDir = fs.mkdtempSync(path.join(os.tmpdir(), 'probable-cancelled-text-'));
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: Test\n\n## Approved Instruments\n| ISIN / Ticker | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| IE000XZSV718 | State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc) | Global equities | 40 | 30 | 50 | LSEETF / SMART | EUR | ibkr_symbol=SPYLX; ibkr_local_symbol=SPYLX; ibkr_conid=999999; ibkr_primary_exchange=LSEETF; fx_to_chf=0.96 |\n`);
fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: Test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-11 06:33:50 | submitted | buy | IE000XZSV718 | State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc) | 105 | 15.5 | 1560.83 | 0 | Replacement for CSPX after live quote-path validation using SPYL during earlier work. | submitted_to_broker | 9105 |\n`);
fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: Test\n\n## Daily Valuation History\n\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-11 | end_of_day | 5000 | 0 | 5000 | 0 | 0 | test |\n`);
fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: Test\n\n- Date/time: 2026-05-11 00:00:00\n- Total value CHF: 5000\n- Invested value CHF: 0\n- Cash CHF: 5000\n\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Last price | Market value CHF | Allocation % | Cost basis CHF | Unrealized P/L CHF | Notes |\n|---|---|---:|---:|---:|---:|---:|---:|---|\n`);

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '../brokers/interactive-brokers/client') {
    return {
      InteractiveBrokersClient: class {
        async getOrderStatus() {
          return {
            ok: false,
            reason: 'not_found',
            orderId: 9105,
            message: 'No exact broker order id match was found, but completed-order hints are available.',
            hints: { completedOrders: [{ orderId: 0, permId: 617503611, symbol: 'SPYL', status: 'Cancelled', quantity: 105 }] },
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
  const result = await syncPortfolioOrderStatus({ portfolioDir, orderId: 9105, selector: { orderId: 9105, tickerOrIsin: 'IE000XZSV718', action: 'buy' }, refreshHoldingsOnFill: false });
  const row = readTradesTable(path.join(portfolioDir, 'trades.md')).rows[0];
  assert.strictEqual(result.reason, 'not_found');
  assert.strictEqual(row.Status, 'failed');
  assert.strictEqual(row.Approval, 'not_found');
  assert(!String(row.Reason).includes('completed-order evidence suggests cancellation'));
  console.log(JSON.stringify({ ok: true, result, row }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
