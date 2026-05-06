const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'writable-live-lane-acceptance-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Created: 2026-05-01\n- Last reviewed: 2026-05-05\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: require_confirmation\n- Asset scope: ETF only\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |\n\n## Market Entry Policy\n- Require confirmation before first live trade: false\n\n## Risk Limits\n- Max single ETF allocation: 50%\n- Max single issuer allocation: 60%\n- Max equity allocation: 80%\n- Max bond duration: n/a\n- Max cash drag after full deployment: 25%\n- Stop trading if portfolio value drops by: 20% over 30 calendar days\n- Stop trading if broker/API errors occur: true\n\n## Automation Permissions\n- Require user approval for new instruments: yes\n- Require user approval for first purchase: no\n- Require user approval for sales: no\n\n## Notes / Open Questions\n- settled\n`);

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
          async placeOrder(order, { dryRun }) {
            return {
              ok: true,
              dryRun,
              submitted: false,
              order: {
                orderId: 4242,
                status: 'Submitted',
                action: order.action,
                identifier: order.conid,
                symbol: order.symbol,
                quantity: order.quantity,
                limitPrice: order.limitPrice,
                estimatedValue: Number(order.quantity) * Number(order.limitPrice),
                currency: order.currency,
                transmit: false,
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
            return {
              ok: true,
              order: {
                orderId: String(orderId),
                status: 'Cancelled',
                quantity: 2,
                filled: 0,
                remaining: 2,
                transmit: true,
              },
            };
          }
        }
      };
    }
    if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
      return {
        getInteractiveBrokersReadiness: async () => ({ authenticated: true, message: 'ok' }),
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
        userApproved: true,
      },
    });
    assert(staged.ok, `Expected staged order ok, got ${JSON.stringify(staged)}`);

    const submittedSync = await syncPortfolioOrderStatus({
      portfolioDir,
      orderId: '4242',
      selector: { orderId: '4242', tickerOrIsin: 'AAA', action: 'buy' },
      reasonNote: 'Writable acceptance submitted sync.',
      refreshHoldingsOnFill: false,
    });
    assert(submittedSync.ok, `Expected submitted sync ok, got ${JSON.stringify(submittedSync)}`);

    const cancelledSync = await syncPortfolioOrderStatus({
      portfolioDir,
      orderId: '4242',
      selector: { orderId: '4242', tickerOrIsin: 'AAA', action: 'buy' },
      reasonNote: 'Writable acceptance cancelled sync.',
      refreshHoldingsOnFill: false,
    });
    assert(cancelledSync.ok, `Expected cancelled sync ok, got ${JSON.stringify(cancelledSync)}`);

    const rows = readTradesTable(path.join(portfolioDir, 'trades.md')).rows;
    assert(rows.length === 1, `Expected one row after full writable acceptance scenario, got ${rows.length}`);
    assert(rows[0].Status === 'cancelled', `Expected cancelled status after second sync, got ${rows[0].Status}`);
    assert(rows[0].Approval === 'cancelled', `Expected cancelled approval after second sync, got ${rows[0].Approval}`);
    assert(rows[0]['Broker order id'] === '4242', `Expected broker order id preserved, got ${rows[0]['Broker order id']}`);
    assert(String(rows[0].Reason).includes('Writable acceptance submitted sync.'), 'Expected submitted sync audit note on final row');
    assert(String(rows[0].Reason).includes('Writable acceptance cancelled sync.'), 'Expected cancelled sync audit note on final row');

    const historyText = fs.readFileSync(path.join(portfolioDir, 'history.md'), 'utf8');
    assert(historyText.includes('execution_staged'), 'Expected execution_staged history snapshot');
    assert(historyText.includes('execution_submitted'), 'Expected execution_submitted history snapshot');
    assert(historyText.includes('execution_cancelled'), 'Expected execution_cancelled history snapshot');

    console.log(JSON.stringify({ ok: true, row: rows[0], statusLookups }, null, 2));
  } finally {
    Module._load = originalLoad;
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
