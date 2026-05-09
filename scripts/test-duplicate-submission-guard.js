const fs = require('fs');
const path = require('path');
const os = require('os');
const { stagePortfolioOrder } = require('../src/execution/portfolioExecution');

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'duplicate-submission-guard-'));
  const portfolioDir = path.join(tempDir, 'portfolio');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Created: 2026-05-01\n- Last reviewed: 2026-05-03\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: require_confirmation\n- Asset scope: ETF only\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Equity | 20 | 0 | 30 | SIX | CHF | |\n\n## Risk Limits\n- Max single ETF allocation: 25%\n- Max single issuer allocation: 25%\n- Max equity allocation: 80%\n- Max bond duration: n/a\n- Max cash drag after full deployment: 10%\n- Stop trading if portfolio value drops by: 10% over 30d\n- Stop trading if broker/API errors occur: true\n\n## Market Entry Policy\n- Require confirmation before first live trade: true\n\n## Notes / Open Questions\n- settled\n`);

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-03 10:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 0\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 5000 | 1 | 5000 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n- Warnings:\n`);

  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: demo\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 10:00:00 | approved | buy | AAA | ETF A | 1 | 100 | 100 | 0 | approved | user_approved | |\n`);

  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History: demo\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n`);

  const result = await stagePortfolioOrder({
    portfolioDir,
    dryRun: true,
    revocableOnly: true,
    order: {
      symbol: 'AAA',
      action: 'BUY',
      quantity: 1,
      limitPrice: 100,
    },
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
  if (result.reason === 'duplicate_submission_blocked') process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
