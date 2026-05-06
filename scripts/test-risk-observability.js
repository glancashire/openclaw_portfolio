const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { evaluateSafetyControls } = require('../src/validation/safetyControls');
const { readRuntimeEvents, summarizeRuntimeEvents } = require('../src/observability/runtimeEvents');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'risk-observability-'));
const portfolioDir = path.join(tmp, 'portfolio');
fs.mkdirSync(portfolioDir, { recursive: true });

fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: Test\n\n## Status\n- Status: active\n- Broker account reference: demo\n- Execution mode: require_confirmation\n\n## Risk Limits\n- Max single ETF allocation: 50%\n- Max single issuer allocation: 60%\n- Max cash drag after full deployment: 25%\n\n## Notes / Open Questions\n- Decide final issuer mix?\n`);
fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings: Test\n\n## Data Quality\n- Unmatched holdings: none\n- Pricing source: stale_cache\n- Warnings:\n - stale price data\n\n## Current Holdings\n| Ticker / ISIN | Name | Quantity | Price | Market value CHF | Currency | Allocation % |\n|---|---|---:|---:|---:|---|---:|\n| AAA | ETF A | 1 | 100 | 100 | CHF | 70 |\n`);

const result = evaluateSafetyControls({ portfolioPath: path.join(portfolioDir, 'portfolio.md'), holdingsPath: path.join(portfolioDir, 'holdings.md') });
assert(result.blockers.length >= 2, 'expected multiple blockers');
assert(result.diagnostics.holdingsHealth.stalePricing === true, 'expected stale pricing diagnostic');
assert(result.diagnostics.holdingsHealth.maxObservedWeightPct === 70, 'expected max observed weight');

const events = readRuntimeEvents({ portfolio: 'portfolio', limit: 20 });
assert(events.length >= 1, 'expected runtime event emission');
const latest = events[events.length - 1];
assert(latest.category === 'risk', 'expected risk event');
assert(latest.status === 'blocked', 'expected blocked status');
const summary = summarizeRuntimeEvents(events);
assert(summary.blockedTrades >= 1, 'expected blocked trade summary count');

console.log(JSON.stringify({ ok: true, blockers: result.blockers.length, events: events.length }, null, 2));
