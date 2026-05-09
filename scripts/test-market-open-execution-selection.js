'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'market-open-selection-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Created: 2026-05-01\n- Last reviewed: 2026-05-05\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: require_confirmation\n- Asset scope: ETF only\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |\n| BBB | ETF B | Swiss equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=BBB; ibkr_conid=1002 |\n\n## Market Entry Policy\n- Require confirmation before first live trade: false\n\n## Risk Limits\n- Max single ETF allocation: 50%\n- Max single issuer allocation: 60%\n- Max equity allocation: 80%\n- Max bond duration: n/a\n- Max cash drag after full deployment: 25%\n- Stop trading if portfolio value drops by: 20% over 30 calendar days\n- Stop trading if broker/API errors occur: true\n\n## Automation Permissions\n- Require user approval for new instruments: yes\n- Require user approval for first purchase: no\n- Require user approval for sales: no\n\n## Notes / Open Questions\n- settled\n`);

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-05 11:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 1000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| ZZZ | Existing ETF | Global equities | 1 | 1000 | CHF | 1 | 1000 | 20 | 20 | 0 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 5000 | 1 | 5000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n`);

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: demo\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-09 09:00:00 | approved | buy | AAA | ETF A | 2 | 101 | 202 | 0 | approved AAA | user_approved | | | | | |\n| 2026-05-09 09:00:01 | approved | buy | BBB | ETF B | 3 | 102 | 306 | 0 | approved BBB | user_approved | | | | | |\n| 2026-05-09 09:00:02 | rejected | buy | CCC | ETF C | 1 | 103 | 103 | 0 | rejected CCC | user_rejected | | | | | |\n`);

  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: demo\n\n## Snapshots\n`);

  const originalLoad = Module._load;
  const calls = [];
  Module._load = function(request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return { getInteractiveBrokersReadiness: async () => ({ configured: true, authenticated: true, reachable: true, fallbackRequired: false, reason: 'ready', message: 'ok' }) };
    }
    if (request.endsWith('../brokers/interactive-brokers/client') || request === '../brokers/interactive-brokers/client') {
      return {
        InteractiveBrokersClient: class FakeClient {
          async placeOrder(order, opts) {
            calls.push({ order, opts });
            return { ok: true, dryRun: opts.dryRun, order: { orderId: 777, status: 'Submitted', transmit: false }, quote: { referencePrice: order.limitPrice, estimatedValue: order.quantity * order.limitPrice } };
          }
        }
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    const { stagePortfolioOrder } = require('../src/execution/portfolioExecution');
    const { readTradesTable } = require('../src/execution/tradeState');

    await stagePortfolioOrder({ portfolioDir, dryRun: false, revocableOnly: true, order: { symbol: 'AAA', conid: '1001', action: 'BUY', quantity: 2, orderType: 'LMT', limitPrice: 101, currency: 'CHF', exchange: 'SMART', secType: 'STK', userApproved: true } });

    assert(calls.length === 1, 'expected one broker call');
    assert(calls[0].order.symbol === 'AAA', 'expected AAA order submitted');

    const rows = readTradesTable(path.join(portfolioDir, 'trades.md')).rows;
    assert(rows.length >= 2, 'expected trade rows present');
    assert(rows[0].Status === 'submitted' || rows[0].Status === 'approved', 'AAA row should be acted on, not ignored');

    console.log(JSON.stringify({ ok: true, calls, rows }, null, 2));
  } finally {
    Module._load = originalLoad;
  }
}

main().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
