const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateAndWriteReport } = require('../src/reporting/reportGenerator');

function seedPortfolio(repoRoot) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), '# Portfolio: demo\n');
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n- Total value CHF: 5000\n- Cash CHF: 4000\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Price | Market value CHF | Allocation % | Target % | Drift % |\n|---|---|---:|---:|---:|---:|---:|---:|\n| DEMO | Demo ETF | 10 | 100 | 1000 | 20 | 20 | 0 |\n');
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\nallocation after\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), '# History\n\nreport cycle snapshot\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n\n## Execution Plan\n\n- Total value: CHF 5000\n- Cash: CHF 4000\n');
  return portfolioDir;
}

(async function main() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'report-generator-datestamp-'));
  const portfolioDir = seedPortfolio(repoRoot);
  const result = await generateAndWriteReport({ portfolioDir, period: 'weekly' });
  assert(result.markdownPath.endsWith('.md'));
  assert(result.htmlPath.endsWith('.html'));
  assert(result.jsonPath.endsWith('.json'));
  assert(!result.markdownPath.includes('undefined'));
  assert(!result.htmlPath.includes('undefined'));
  assert(!result.jsonPath.includes('undefined'));
  assert(/portfolio_report_demo_weekly_\d{8}\.md$/.test(result.markdownPath), `unexpected markdown path: ${result.markdownPath}`);
  assert(fs.existsSync(result.markdownPath));
  assert(fs.existsSync(result.htmlPath));
  assert(fs.existsSync(result.jsonPath));
  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
