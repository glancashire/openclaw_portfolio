const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'submit-open-primary-'));
const portfolioDir = path.join(dir, 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });

fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ETF\n\n## Status\n- Status: active\n- Execution mode: transmitted_live\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | Global equities | 40 | 30 | 50 | IBIS / SMART | EUR | ibkr_symbol=UBSPX; ibkr_local_symbol=BCFT; ibkr_conid=808613958; ibkr_primary_exchange=IBIS |\n`);

fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-21 09:27:46 | approved | buy | IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | 8 | 122.845 | 984.28 | 0 | test row | queued_for_open_runner |  |  |  |  | First open-runner attempt pending. |\n`);

const source = fs.readFileSync(path.resolve(root, 'scripts/submit-orders-at-open.js'), 'utf8');
assert(!source.includes("instrument?.exchange?.includes('EBS') ? 'EBS' : undefined"), 'submit-orders-at-open.js should no longer derive primaryExchange from EBS-only heuristic');
assert(source.includes("prepareExecutableRowOrder"), 'submit-orders-at-open.js should route executable rows through the shared row-preparation helper');
console.log(JSON.stringify({ ok: true }, null, 2));
