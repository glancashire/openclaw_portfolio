const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cancel-staged-order-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Created: 2026-05-01\n- Last reviewed: 2026-05-05\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: require_confirmation\n- Asset scope: ETF only\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |\n\n## Market Entry Policy\n- Require confirmation before first live trade: false\n\n## Risk Limits\n- Max single ETF allocation: 50%\n- Max single issuer allocation: 60%\n- Max equity allocation: 80%\n- Max bond duration: n/a\n- Max cash drag after full deployment: 25%\n- Stop trading if portfolio value drops by: 20% over 30 calendar days\n- Stop trading if broker/API errors occur: true\n\n## Automation Permissions\n- Require user approval for new instruments: yes\n- Require user approval for first purchase: no\n- Require user approval for sales: no\n\n## Notes / Open Questions\n- settled\n`);

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-05 11:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 1000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| ZZZ | Existing ETF | Global equities | 1 | 1000 | CHF | 1 | 1000 | 20 | 20 | 0 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 5000 | 1 | 5000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n`);

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: demo\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-05 11:10:00 | staged | buy | AAA | ETF A | 2 | 50 | 100 | 0 | staged broker order | staged_not_transmitted | 4242 |\n`);
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: demo\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-05 | end_of_day | 6000 | 1000 | 5000 | 0 | 0 | seed |\n`);
  fs.mkdirSync(path.join(portfolioDir, 'reports'), { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');

  const originalLoad = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request.endsWith('../brokers/interactive-brokers/client') || request === '../brokers/interactive-brokers/client') {
      return {
        InteractiveBrokersClient: class FakeClient {
          async cancelOrder(orderId) {
            return {
              ok: true,
              cancel: {
                orderId: String(orderId),
                status: 'cancelled',
                message: 'Broker cancel requested.',
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
    const { cancelPortfolioOrder } = require('../src/execution/portfolioExecution');
    const { readTradesTable } = require('../src/execution/tradeState');

    const result = await cancelPortfolioOrder({
      portfolioDir,
      orderId: '4242',
      selector: { orderId: '4242', tickerOrIsin: 'AAA', action: 'buy' },
      userApproved: true,
    });

    assert(result.ok, `Expected cancel result ok, got ${JSON.stringify(result)}`);

    const rows = readTradesTable(path.join(portfolioDir, 'trades.md')).rows;
    assert(rows.length === 1, `Expected in-place reconciliation without duplicate rows, got ${rows.length}`);
    const row = rows[0];
    assert(row.Status === 'cancelled', `Expected cancelled status, got ${row.Status}`);
    assert(row.Approval === 'cancelled', `Expected cancelled approval, got ${row.Approval}`);
    assert(row['Broker order id'] === '4242', `Expected broker order id 4242, got ${row['Broker order id']}`);
    assert(String(row.Reason || '').includes('Broker cancel requested.'), 'Expected cancel reason note to be recorded');

    console.log(JSON.stringify({ ok: true, row }, null, 2));
  } finally {
    Module._load = originalLoad;
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
