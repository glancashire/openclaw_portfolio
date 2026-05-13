const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { proposeTrades } = require('../src/analysis/tradeProposalEngine');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proposal-cash-parse-'));
const portfolioPath = path.join(dir, 'portfolio.md');
const holdingsPath = path.join(dir, 'holdings.md');

fs.writeFileSync(portfolioPath, `# Portfolio: demo\n\n## Allocation Targets\n| Asset class | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Global equities | 60 | 50 | 70 | |\n| Swiss equities | 20 | 10 | 30 | |\n| Bonds / cash-like | 20 | 10 | 30 | |\n\n## Rebalancing Policy\n- Rebalance threshold: absolute drift > 5 percentage points or relative drift > 20%\n- Minimum trade size: CHF 500\n- Avoid unnecessary trades: true\n- Prefer using new cash before selling: true\n- Max cash drag after full deployment: 25%\n`);

fs.writeFileSync(holdingsPath, `# Holdings: demo\n\n## Last Sync\n- Date/time: 2026-05-13 13:00:00\n- Source: broker_api\n- Broker: interactive-brokers\n- Base currency: CHF\n- Total value CHF: 5083.34\n- Cash CHF: 4048.26\n- Invested value CHF: 1035.08\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n| 243939970 | EMUAA | Global equities | 26 | 39.8108 | EUR | 1 | 1035.08 | 20.36 | 60 | -39.64 |\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | 4048.26 | 1 | 4048.26 |\n\n## Data Quality\n- All holdings matched to approved instruments: yes\n- Unmatched holdings: none\n- Pricing source: broker_api\n- Warnings:\n - Instrument-level target mapping is not implemented yet.\n`);

const result = proposeTrades({ portfolioPath, holdingsPath });
assert.strictEqual(result.cashChf, 4048.26, `expected cashChf 4048.26, got ${result.cashChf}`);
assert(result.proposals.length > 0, 'expected non-empty proposals when CHF cash is present');
console.log(JSON.stringify({ ok: true, cashChf: result.cashChf, proposals: result.proposals.length }, null, 2));
