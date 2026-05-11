const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildDeliveryOverview, renderDeliveryStatusMarkdown } = require('../src/reporting/summaryArtifacts');

function seedPortfolio(repoRoot, portfolioName = 'demo') {
  const portfolioDir = path.join(repoRoot, 'portfolio', portfolioName);
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ${portfolioName}\n\n## Status\n- Status: active\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: transmitted_live\n`);
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-11 09:40:00 | inactive | buy | IE000XZSV718 | SPYL | 105 | 15.5 | 1560.83 | 0 | live submit | broker_inactive | 9105 | exchange_closed_at_submit | Broker rejected the order because the target exchange was closed at submission time. | 2026-05-11 09:40:02 | Retry during the venue trading session or hand the row back to the market-open runner. |\n| 2026-05-11 09:45:00 | filled | buy | AAA | ETF A | 1 | 500 | 500 | 500 | note | broker_filled | 9107 |  |  |  |  |\n`);
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-11 | fill | 5000 | 1000 | 4000 | 0 | 0 | ok |\n`);
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [9107] }, null, 2));
  return portfolioDir;
}

(function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-markdown-broker-block-'));
  seedPortfolio(repoRoot);
  const overview = buildDeliveryOverview(repoRoot);
  const markdown = renderDeliveryStatusMarkdown(overview);

  assert(markdown.includes('## Per-Portfolio Delivery Posture'), 'expected delivery posture section');
  assert(markdown.includes('Broker block context:'), 'expected broker block context section');
  assert(markdown.includes('Count: 1'), 'expected broker block count');
  assert(markdown.includes('[exchange_closed_at_submit] IE000XZSV718 — SPYL'), 'expected broker block row');
  assert(markdown.includes('Reason: Broker rejected the order because the target exchange was closed at submission time.'), 'expected broker block reason');
  assert(markdown.includes('Next action: Retry during the venue trading session or hand the row back to the market-open runner.'), 'expected broker block next action');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
