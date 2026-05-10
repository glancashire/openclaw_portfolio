const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transmitted-live-lane-acceptance-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Created: 2026-05-01\n- Last reviewed: 2026-05-05\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: transmitted_live\n- Asset scope: ETF only\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |\n\n## Market Entry Policy\n- Require confirmation before first live trade: false\n\n## Risk Limits\n- Max single ETF allocation: 50%\n- Max single issuer allocation: 60%\n- Max equity allocation: 80%\n- Max bond duration: n/a\n- Max cash drag after full deployment: 25%\n- Stop trading if portfolio value drops by: 20% over 30 calendar days\n- Stop trading if broker/API errors occur: true\n\n## Automation Permissions\n- Require user approval for new instruments: yes\n- Require user approval for first purchase: no\n- Require user approval for sales: no\n\n## Notes / Open Questions\n- settled\n`);

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-05 11:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 1000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| ZZZ | Existing ETF | Global equities | 1 | 1000 | CHF | 1 | 1000 | 20 | 20 | 0 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 5000 | 1 | 5000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n`);

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: demo\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n`);
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: demo\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-05 | end_of_day | 6000 | 1000 | 5000 | 0 | 0 | seed |\n`);
  fs.mkdirSync(path.join(portfolioDir, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');

  const originalLoad = Module._load;
  let statusLookups = 0;
  Module._load = function(request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/client') || request === '../brokers/interactive-brokers/client') {
      return {
        InteractiveBrokersClient: class FakeClient {
          async placeOrder(order, { dryRun, transmitLive }) {
            return {
              ok: true,
              dryRun,
              submitted: transmitLive === true,
              mode: transmitLive === true ? 'transmitted_live' : 'staged_not_transmitted',
              order: {
                orderId: 5252,
                status: 'Submitted',
                action: order.action,
                identifier: order.conid,
                symbol: order.symbol,
                quantity: order.quantity,
                limitPrice: order.limitPrice,
                estimatedValue: Number(order.quantity) * Number(order.limitPrice),
                currency: order.currency,
                transmit: transmitLive === true,
              },
              quote: {
                referencePrice: order.limitPrice,
                estimatedValue: Number(order.quantity) * Number(order.limitPrice),
                currency: order.currency,
              },
            };
          }

          async getOrderStatus(orderId) {
            statusLookups += 1;
            if (statusLookups === 1) {
              return {
                ok: true,
                order: {
                  orderId: String(orderId),
                  status: 'Submitted',
                  quantity: 2,
                  filled: 0,
                  remaining: 2,
                  transmit: true,
                },
              };
            }
            if (statusLookups === 2) {
              return {
                ok: true,
                order: {
                  orderId: String(orderId),
                  status: 'Filled',
                  quantity: 2,
                  filled: 2,
                  remaining: 0,
                  avgFillPrice: 50,
                  transmit: true,
                },
              };
            }
            return {
              ok: false,
              reason: 'not_found',
              error: 'Order not found',
            };
          }
        }
      };
    }
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return {
        getInteractiveBrokersReadiness: async () => ({ authenticated: true, configured: true, reachable: true, fallbackRequired: false, message: 'ok' }),
      };
    }
    if (request.endsWith('../brokers/interactive-brokers/holdingsSync') || request === '../brokers/interactive-brokers/holdingsSync') {
      return {
        syncInteractiveBrokersHoldings: async () => ({ ok: true }),
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    const { stagePortfolioOrder, syncPortfolioOrderStatus } = require('../src/execution/portfolioExecution');
    const { readTradesTable } = require('../src/execution/tradeState');

    const staged = await stagePortfolioOrder({
      portfolioDir,
      dryRun: false,
      revocableOnly: true,
      transmitLive: true,
      order: {
        symbol: 'AAA',
        conid: '1001',
        action: 'BUY',
        quantity: 2,
        orderType: 'LMT',
        limitPrice: 50,
        currency: 'CHF',
        exchange: 'SMART',
        secType: 'STK',
        transmit: true,
        userApproved: true,
        transmittedLiveAck: 'I UNDERSTAND THIS WILL TRANSMIT A LIVE ORDER',
      },
    });
    assert(staged.ok, `Expected transmitted live stage ok, got ${JSON.stringify(staged)}`);

    let rows = readTradesTable(path.join(portfolioDir, 'trades.md')).rows;
    assert(rows.length === 1, `Expected one trade row after transmitted stage, got ${rows.length}`);
    assert(rows[0].Status === 'submitted', `Expected submitted status after transmitted stage, got ${rows[0].Status}`);
    assert(rows[0].Approval === 'submitted_to_broker', `Expected submitted_to_broker approval after transmitted stage, got ${rows[0].Approval}`);
    assert(rows[0]['Broker order id'] === '5252', `Expected broker order id 5252, got ${rows[0]['Broker order id']}`);

    const submittedSync = await syncPortfolioOrderStatus({
      portfolioDir,
      orderId: '5252',
      selector: { orderId: '5252', tickerOrIsin: 'AAA', action: 'buy' },
      reasonNote: 'Transmitted acceptance submitted sync.',
      refreshHoldingsOnFill: false,
    });
    assert(submittedSync.ok, `Expected submitted sync ok, got ${JSON.stringify(submittedSync)}`);

    const filledSync = await syncPortfolioOrderStatus({
      portfolioDir,
      orderId: '5252',
      selector: { orderId: '5252', tickerOrIsin: 'AAA', action: 'buy' },
      reasonNote: 'Transmitted acceptance filled sync.',
      refreshHoldingsOnFill: true,
    });
    assert(filledSync.ok, `Expected filled sync ok, got ${JSON.stringify(filledSync)}`);

    rows = readTradesTable(path.join(portfolioDir, 'trades.md')).rows;
    assert(rows.length === 1, `Expected one row after fill reconciliation, got ${rows.length}`);
    assert(rows[0].Status === 'filled', `Expected filled status after second sync, got ${rows[0].Status}`);
    assert(rows[0].Approval === 'broker_filled', `Expected broker_filled approval after fill, got ${rows[0].Approval}`);
    assert(String(rows[0].Reason).includes('Transmitted acceptance submitted sync.'), 'Expected submitted sync note on final row');
    assert(String(rows[0].Reason).includes('Transmitted acceptance filled sync.'), 'Expected filled sync note on final row');

    const notFoundSync = await syncPortfolioOrderStatus({
      portfolioDir,
      orderId: '5252',
      selector: { orderId: '5252', tickerOrIsin: 'AAA', action: 'buy' },
      reasonNote: 'Transmitted acceptance post-fill not_found sync.',
      refreshHoldingsOnFill: false,
    });
    assert(notFoundSync.reason === 'not_found', `Expected not_found after terminal fill, got ${JSON.stringify(notFoundSync)}`);

    const historyText = fs.readFileSync(path.join(portfolioDir, 'history.md'), 'utf8');
    assert(historyText.includes('execution_staged'), 'Expected execution_staged history snapshot for transmitted submission');
    assert(historyText.includes('execution_submitted'), 'Expected execution_submitted history snapshot');
    assert(historyText.includes('execution_filled'), 'Expected execution_filled history snapshot');
    assert(historyText.includes('execution_not_found'), 'Expected execution_not_found history snapshot');

    console.log(JSON.stringify({ ok: true, row: rows[0], statusLookups }, null, 2));
  } finally {
    Module._load = originalLoad;
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
