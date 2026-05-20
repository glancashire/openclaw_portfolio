const assert = require('assert');
const { proposeTrades } = require('../src/analysis/tradeProposalEngine');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trade-math-'));
fs.writeFileSync(path.join(tmp, 'portfolio.md'), `# Portfolio\n\n## Allocation Targets\n| Asset class | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Global equities | 60 | 50 | 70 | Broad developed-market ETF |\n| Swiss equities | 20 | 10 | 30 | CHF exposure |\n| Bonds / cash-like | 20 | 10 | 30 | CHF cash |\n\n## Rebalancing Policy\n- Minimum trade size: CHF 500\n- Rebalance threshold: absolute drift > 5 percentage points or relative drift > 20%\n- Avoid unnecessary trades: true\n- Prefer using new cash before selling: true\n\n## Risk Limits\n- Max cash drag after full deployment: 25%\n`);
fs.writeFileSync(path.join(tmp, 'holdings.md'), `# Holdings\n\n## Last Sync\n- Total value CHF: 10000\n- Cash CHF: 2500\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| A | Global ETF | Global equities | 1 | 5000 | CHF | 1 | 5000 | 0 | 0 | 0 |\n| B | Swiss ETF | Swiss equities | 1 | 2500 | CHF | 1 | 2500 | 0 | 0 | 0 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 2500 | 1 | 2500 |\n`);
const result = proposeTrades({ portfolioPath: path.join(tmp, 'portfolio.md'), holdingsPath: path.join(tmp, 'holdings.md') });
assert.strictEqual(result.proposals.length, 1);
assert.strictEqual(result.proposals[0].assetClass, 'Global equities');
assert.strictEqual(result.proposals[0].allocationBeforePct, 50);
assert.strictEqual(result.proposals[0].allocationAfterPct, 75);
assert.strictEqual(result.proposals[0].blocked, true);
console.log(JSON.stringify({ ok: true, proposal: result.proposals[0] }, null, 2));
