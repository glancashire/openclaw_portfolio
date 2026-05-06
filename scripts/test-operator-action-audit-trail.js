const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'operator-action-audit-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Created: 2026-05-01\n- Last reviewed: 2026-05-05\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: require_confirmation\n- Asset scope: ETF only\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |\n| BBB | ETF B | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=BBB; ibkr_conid=1002 |\n\n## Market Entry Policy\n- Require confirmation before first live trade: false\n\n## Risk Limits\n- Max single ETF allocation: 80%\n- Max single issuer allocation: 80%\n- Max equity allocation: 100%\n- Max bond duration: n/a\n- Max cash drag after full deployment: 25%\n- Stop trading if portfolio value drops by: 20% over 30 calendar days\n- Stop trading if broker/API errors occur: true\n\n## Automation Permissions\n- Require user approval for new instruments: yes\n- Require user approval for first purchase: no\n- Require user approval for sales: no\n\n## Notes / Open Questions\n- settled\n`);

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-05 11:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 1000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| ZZZ | Existing ETF | Global equities | 1 | 1000 | CHF | 1 | 1000 | 20 | 20 | 0 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 5000 | 1 | 5000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n`);

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: demo\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-05 11:05:00 | proposed | buy | AAA | ETF A | 2 | 50 | 100 | 0 | initial proposal | pending_user_approval | |\n| 2026-05-05 11:06:00 | approved | buy | BBB | ETF B | 1 | 70 | 70 | 0 | approved awaiting cancel path | user_approved | 5252 |\n`);
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

          async getOrderStatus(orderId) {
            return {
              ok: true,
              order: {
                orderId: String(orderId),
                status: 'Submitted',
                quantity: 1,
                filled: 0,
                remaining: 1,
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
    const {
      approvePortfolioTrade,
      rejectPortfolioTrade,
      cancelPortfolioOrder,
      resyncPortfolioOrders,
    } = require('../src/execution/portfolioExecution');
    const { readTradesTable } = require('../src/execution/tradeState');

    const approved = await approvePortfolioTrade({
      portfolioDir,
      selector: { tickerOrIsin: 'AAA', action: 'buy' },
    });
    assert(approved.ok, `Expected approval ok, got ${JSON.stringify(approved)}`);

    const rejected = await rejectPortfolioTrade({
      portfolioDir,
      selector: { tickerOrIsin: 'AAA', action: 'buy', status: 'approved' },
    });
    assert(rejected.ok, `Expected rejection ok, got ${JSON.stringify(rejected)}`);

    const cancelled = await cancelPortfolioOrder({
      portfolioDir,
      orderId: '5252',
      selector: { orderId: '5252', tickerOrIsin: 'BBB', action: 'buy' },
      userApproved: true,
    });
    assert(cancelled.ok, `Expected cancel ok, got ${JSON.stringify(cancelled)}`);

    fs.appendFileSync(path.join(portfolioDir, 'trades.md'), `| 2026-05-05 11:07:00 | submitted | buy | BBB | ETF B | 1 | 70 | 70 | 0 | submission row | submitted_to_broker | 6262 |\n`);
    const resynced = await resyncPortfolioOrders({ portfolioDir, refreshHoldingsOnFill: false });
    assert(resynced.ok, `Expected resync ok, got ${JSON.stringify(resynced)}`);

    const rows = readTradesTable(path.join(portfolioDir, 'trades.md')).rows;
    const aaa = rows.find((row) => row['Ticker / ISIN'] === 'AAA');
    const cancelledBbb = rows.find((row) => row['Broker order id'] === '5252');
    const resyncedBbb = rows.find((row) => row['Broker order id'] === '6262');

    assert(String(aaa.Reason).includes('Operator approval recorded.'), 'Expected approval audit note on AAA row');
    assert(String(aaa.Reason).includes('Operator rejection recorded.'), 'Expected rejection audit note on AAA row');
    assert(cancelledBbb.Status === 'cancelled', `Expected cancelled BBB row, got ${cancelledBbb.Status}`);
    assert(String(cancelledBbb.Reason).includes('Broker cancel requested.'), 'Expected cancel audit note on BBB row');
    assert(resyncedBbb.Status === 'submitted', `Expected resynced BBB row submitted, got ${resyncedBbb.Status}`);
    assert(String(resyncedBbb.Reason).includes('Operator resync refreshed open broker order state.'), 'Expected resync audit note on BBB row');

    console.log(JSON.stringify({ ok: true, rows }, null, 2));
  } finally {
    Module._load = originalLoad;
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
