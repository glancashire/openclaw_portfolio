const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const { evaluateExecutionPolicy } = require('../src/execution/portfolioExecution');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'execution-policy-approval-gates-'));
  const portfolioDir = path.join(tempDir, 'demo');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Created: 2026-05-01\n- Last reviewed: 2026-05-05\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: auto_trade_limited\n- Asset scope: ETF only\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |\n\n## Market Entry Policy\n- Require confirmation before first live trade: false\n\n## Risk Limits\n- Max single ETF allocation: 50%\n- Max single issuer allocation: 60%\n- Max equity allocation: 80%\n- Max bond duration: n/a\n- Max cash drag after full deployment: 25%\n- Stop trading if portfolio value drops by: 20% over 30 calendar days\n- Stop trading if broker/API errors occur: true\n\n## Automation Permissions\n- Require user approval for new instruments: yes\n- Require user approval for first purchase: yes\n- Require user approval for sales: yes\n\n## Notes / Open Questions\n- settled\n`);

  const emptyHoldings = `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-05 10:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 0\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 5000 | 1 | 5000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n- Warnings:\n - No holdings yet.\n`;

  const investedHoldings = `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-05 10:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5200\n- Cash CHF: 200\n- Invested value CHF: 5000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| AAA | ETF A | Global equities | 10 | 500 | CHF | 1 | 5000 | 96.15 | 50 | 46.15 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 200 | 1 | 200 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n- Warnings:\n - none\n`;

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), emptyHoldings);

  const firstBuyBlocked = await evaluateExecutionPolicy({
    portfolioDir,
    live: true,
    requireApproval: false,
    order: {
      symbol: 'AAA',
      conid: '1001',
      action: 'BUY',
      quantity: 1,
      orderType: 'LMT',
      limitPrice: 100,
      currency: 'CHF',
      exchange: 'SIX',
      secType: 'STK',
    },
  });

  assert(firstBuyBlocked.blockers.includes('Portfolio requires explicit user approval before the first live purchase.'), 'First live buy should require explicit approval when portfolio is not yet invested');

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), investedHoldings);

  const nonFirstBuy = await evaluateExecutionPolicy({
    portfolioDir,
    live: true,
    requireApproval: false,
    order: {
      symbol: 'AAA',
      conid: '1001',
      action: 'BUY',
      quantity: 1,
      orderType: 'LMT',
      limitPrice: 100,
      currency: 'CHF',
      exchange: 'SIX',
      secType: 'STK',
    },
  });

  assert(!nonFirstBuy.blockers.includes('Portfolio requires explicit user approval before the first live purchase.'), 'Subsequent buys should not be treated as first purchases once invested capital exists');

  const sellBlocked = await evaluateExecutionPolicy({
    portfolioDir,
    live: true,
    requireApproval: false,
    order: {
      symbol: 'AAA',
      conid: '1001',
      action: 'SELL',
      quantity: 1,
      orderType: 'LMT',
      limitPrice: 100,
      currency: 'CHF',
      exchange: 'SIX',
      secType: 'STK',
    },
  });

  assert(sellBlocked.blockers.includes('Portfolio requires explicit user approval before live sales.'), 'Live sales should require explicit approval when portfolio policy says so');

  console.log(JSON.stringify({ ok: true, firstBuyBlocked, nonFirstBuy, sellBlocked }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
