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

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: demo

## Status
- Status: active
- Created: 2026-05-01
- Last reviewed: 2026-05-05
- Base currency: CHF
- Broker: interactive-brokers
- Broker account reference: demo
- Execution mode: require_confirmation
- Asset scope: ETF only

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |
| BBB | ETF B | Swiss equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=BBB; ibkr_conid=1002 |

## Market Entry Policy
- Require confirmation before first live trade: false

## Risk Limits
- Max single ETF allocation: 50%
- Max single issuer allocation: 60%
- Max equity allocation: 80%
- Max bond duration: n/a
- Max cash drag after full deployment: 25%
- Stop trading if portfolio value drops by: 20% over 30 calendar days
- Stop trading if broker/API errors occur: true

## Automation Permissions
- Require user approval for new instruments: yes
- Require user approval for first purchase: no
- Require user approval for sales: no

## Notes / Open Questions
- settled
`);

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: demo

## Last Sync
- Date/time: 2026-05-05 11:00:00
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 5000
- Cash CHF: 5000
- Invested value CHF: 1000

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
| ZZZ | Existing ETF | Global equities | 1 | 1000 | CHF | 1 | 1000 | 20 | 20 | 0 |

## Cash
| Currency | Amount | FX rate to CHF | Value CHF |
|---|---:|---:|---:|
| CHF | 5000 | 1 | 5000 |

## Data Quality
- All holdings matched to approved instruments: yes
- Unmatched holdings: none
- Pricing source: broker_api
`);

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: demo

## Trade Log

| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |
|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|
| 2026-05-09 09:00:00 | approved | buy | AAA | ETF A | 2 | 101 | 202 | 0 | approved AAA | user_approved | | | | | |
| 2026-05-09 09:00:01 | proposed | buy | BBB | ETF B | 3 | 102 | 306 | 0 | queued BBB | queued_for_open_runner | | | | | |
| 2026-05-09 09:00:02 | rejected | buy | CCC | ETF C | 1 | 103 | 103 | 0 | rejected CCC | user_rejected | | | | | |
`);

  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: demo

## Snapshots
`);

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
    const { listExecutableTradeRows, readTradesTable } = require('../src/execution/tradeState');

    const rowsBefore = listExecutableTradeRows(path.join(portfolioDir, 'trades.md'));
    assert(rowsBefore.length === 2, `expected two executable rows including queued open-runner row, got ${rowsBefore.length}`);
    assert(rowsBefore.some((row) => row.tickerOrIsin === 'BBB'), 'expected queued BBB row to be selectable');

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
