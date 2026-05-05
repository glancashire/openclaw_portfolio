const fs = require('fs');
const path = require('path');
const os = require('os');
const { latestTradeProposals } = require('../src/reporting/portfolioData');
const { buildExecutionPlan } = require('../src/analysis/executionPlan');

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'latest-trade-proposals-'));
  const tradesPath = path.join(tempDir, 'trades.md');
  const portfolioPath = path.join(tempDir, 'portfolio.md');

  fs.writeFileSync(portfolioPath, `# Portfolio: test\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Equity | 20 | 0 | 30 | SIX | CHF | |\n| BBB | ETF B | Equity | 20 | 0 | 30 | SIX | CHF | |\n`);

  fs.writeFileSync(tradesPath, `# Trades: test\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n| 2026-05-03 10:00:00 | proposed | buy | AAA | ETF A | 1 | 100 | 100 | 0 | first draft | pending_user_approval | |\n| 2026-05-03 10:00:00 | proposed | buy | BBB | ETF B | 2 | 100 | 200 | 0 | first draft | pending_user_approval | |\n| 2026-05-03 10:10:00 | approved | buy | AAA | ETF A | 1 | 101 | 101 | 0 | approved draft | user_approved | |\n| 2026-05-03 10:20:00 | submitted | buy | AAA | ETF A | 1 | 101 | 101 | 0 | submitted draft | submitted_to_broker | 123 |\n| 2026-05-03 10:30:00 | proposed | buy | BBB | ETF B | 3 | 110 | 330 | 0 | refreshed draft | pending_user_approval | |\n| 2026-05-03 10:40:00 | filled | buy | AAA | ETF A | 1 | 101 | 101 | 101 | filled draft | broker_filled | 123 |\n`);

  const latest = latestTradeProposals(tradesPath);
  const plan = buildExecutionPlan({ portfolioPath, tradesPath, totalValue: 1000 });

  console.log(JSON.stringify({ latest, plan }, null, 2));
}

main();
