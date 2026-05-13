const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { analyzeAllocation } = require('../src/analysis/allocationAnalysis');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'allocation-cash-sleeve-'));
const portfolioPath = path.join(dir, 'portfolio.md');
const holdingsPath = path.join(dir, 'holdings.md');

fs.writeFileSync(portfolioPath, `# Portfolio: demo\n\n## Allocation Targets\n| Asset class | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Global equities | 60 | 50 | 70 | |\n| Swiss equities | 20 | 10 | 30 | |\n| Bonds / cash-like | 20 | 10 | 30 | |\n`);

fs.writeFileSync(holdingsPath, `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-13 13:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5083.34\n- Cash CHF: 4048.26\n- Invested value CHF: 1035.08\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| 243939970 | EMUAA | Global equities | 26 | 39.8108 | EUR | 1 | 1035.08 | 20.36 | 60 | -39.64 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 4048.26 | 1 | 4048.26 |\n`);

const rows = analyzeAllocation({ portfolioPath, holdingsPath });
const byAsset = new Map(rows.map((row) => [row.assetClass, row]));
assert(Math.abs(byAsset.get('Global equities').current - 20.36) < 0.05, `unexpected global equities current: ${byAsset.get('Global equities').current}`);
assert(Math.abs(byAsset.get('Bonds / cash-like').current - 79.64) < 0.05, `unexpected cash sleeve current: ${byAsset.get('Bonds / cash-like').current}`);
console.log(JSON.stringify({ ok: true, rows }, null, 2));
