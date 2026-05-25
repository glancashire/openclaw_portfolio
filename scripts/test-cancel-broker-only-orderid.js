'use strict';

/* Regression: cancelPortfolioOrder must succeed when an orderId exists at the
 * broker but is NOT present in our local trades.md (the cross-client GTC case
 * from 2026-05-25 where order 102 was placed via TWS UI under clientId=0 and
 * was missing from local state). The function must:
 *   1. Successfully call broker cancel
 *   2. Append a synthetic trade event (reconcile.updated === 0 path)
 *   3. Return ok: true
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cancel-broker-only-'));
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

  // Empty trade log: simulates a broker-only order not tracked locally.
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: demo

## Trade Log

| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |
|---|---|---|---|---|---:|---:|---:|---:|---|---|---|
`);
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: demo

## Daily Valuation History
| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |
|---|---|---:|---:|---:|---:|---:|---|
| 2026-05-05 | end_of_day | 6000 | 1000 | 5000 | 0 | 0 | seed |
`);
  fs.mkdirSync(path.join(portfolioDir, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');

  let cancelCalled = false;
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/client') || request === '../brokers/interactive-brokers/client') {
      return {
        InteractiveBrokersClient: class FakeClient {
          async cancelOrder(orderId) {
            cancelCalled = true;
            return {
              ok: true,
              cancel: {
                orderId: String(orderId),
                status: 'cancelled',
                message: 'Broker cancel requested (cross-client).',
              },
            };
          }
        },
      };
    }
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return {
        getInteractiveBrokersReadiness: async () => ({ authenticated: true, message: 'mock-ready' }),
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    // Clear cached module so the patched Module._load takes effect.
    delete require.cache[require.resolve('../src/execution/portfolioExecution')];
    const { cancelPortfolioOrder } = require('../src/execution/portfolioExecution');

    const result = await cancelPortfolioOrder({
      portfolioDir,
      orderId: 102, // not in trades.md
      selector: { action: 'BUY', tickerOrIsin: 'SPMCHA', name: 'iShares SPI' },
      userApproved: true,
    });

    assert(result.ok, `expected ok:true, got ${JSON.stringify(result)}`);
    assert(cancelCalled, 'expected broker cancelOrder to be invoked');

    const tradesText = fs.readFileSync(path.join(portfolioDir, 'trades.md'), 'utf8');
    assert(/cancelled/i.test(tradesText), `expected appended trade event with cancelled status, got:\n${tradesText}`);
    assert(/SPMCHA/.test(tradesText), 'expected the synthetic event to reference the selector ticker');
  } finally {
    Module._load = originalLoad;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log(JSON.stringify({ ok: true }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
