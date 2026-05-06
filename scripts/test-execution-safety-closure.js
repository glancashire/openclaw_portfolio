const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeFile(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

function makePortfolio() {
  return `# Portfolio: demo

## Status
- Status: active
- Created: 2026-05-01
- Last reviewed: 2026-05-06
- Base currency: CHF
- Broker: interactive-brokers
- Broker account reference: demo
- Execution mode: require_confirmation
- Asset scope: ETF only

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| AAA | ETF A | Global equities | 50 | 0 | 60 | SIX | CHF | ibkr_symbol=AAA; ibkr_conid=1001 |

## Excluded Instruments
| Ticker / ISIN | Reason |
|---|---|
| none | none |

## Market Entry Policy
- Require confirmation before first live trade: false

## Risk Limits
- Max single ETF allocation: 50%
- Max single issuer allocation: 60%
- Max equity allocation: 80%
- Max bond duration: n/a
- Max cash drag after full deployment: 25%
- Stop trading if portfolio value drops by: 20% over 30 calendar days
- Stop trading if broker/API errors occur: true

## Automation Permissions
- Generate trade proposals automatically: yes
- Require user approval for new instruments: yes
- Require user approval for first purchase: no
- Require user approval for sales: no

## Notes / Open Questions
- settled
`;
}

function makeHoldings({ unmatched = 'none', weightPct = 20, pricingSource = 'broker_api' } = {}) {
  return `# Holdings: demo

## Last Sync
- Date/time: 2026-05-06 09:00:00
- Source: broker_api
- Broker: interactive-brokers
- Base currency: CHF
- Total value CHF: 5000
- Cash CHF: 4000
- Invested value CHF: 1000

## Current Holdings
| Currency | Ticker / ISIN | Asset class | Quantity | Price | FX | Value CHF | Weight % | Notes |
|---|---|---|---:|---:|---:|---:|---:|---|
| CHF | AAA | Global equities | 1 | 1000 | 1 | 1000 | ${weightPct} | core holding |

## Cash
| Currency | Amount | FX rate to CHF | Value CHF |
|---|---:|---:|---:|
| CHF | 4000 | 1 | 4000 |

## Data Quality
- All holdings matched to approved instruments: ${unmatched === 'none' ? 'yes' : 'no'}
- Unmatched holdings: ${unmatched}
- Pricing source: ${pricingSource}
`;
}

async function main() {
  const originalLoad = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === '../brokers/interactive-brokers/readiness' || request.endsWith('/brokers/interactive-brokers/readiness')) {
      return { getInteractiveBrokersReadiness: async () => ({ ok: true, configured: true, authenticated: true, reachable: true, fallbackRequired: false, reason: 'ready', message: 'Interactive Brokers read-only connectivity is available.' }) };
    }
    return originalLoad(request, parent, isMain);
  };
  const { evaluateExecutionPolicy, stagePortfolioOrder } = require('../src/execution/portfolioExecution');
  Module._load = originalLoad;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'execution-safety-closure-'));
  writeFile(path.join(dir, 'portfolio.md'), makePortfolio());
  writeFile(path.join(dir, 'holdings.md'), makeHoldings({ unmatched: 'ZZZ', weightPct: 20 }));
  writeFile(path.join(dir, 'trades.md'), '# Trades\n\n## Trade Log\n| Date/time | Status | Approval | Ticker / ISIN | Instrument | Action | Quantity | Limit Price | Estimated CHF | Broker Order ID | Notes |\n|---|---|---|---|---|---|---:|---:|---:|---|---|\n');
  writeFile(path.join(dir, 'history.md'), '# History\n');
  writeFile(path.join(dir, 'dashboard.md'), '# Dashboard\n');

  const unmatchedPolicy = await evaluateExecutionPolicy({
    portfolioDir: dir,
    live: false,
    order: { symbol: 'AAA', conid: '1001', action: 'BUY', quantity: 1 },
  });
  assert(unmatchedPolicy.ok === false, 'Expected unmatched holdings to block execution');
  assert(unmatchedPolicy.blockers.some((item) => /Holdings contain unmatched instruments: ZZZ/i.test(item)), 'Expected explicit unmatched-holdings blocker');

  writeFile(path.join(dir, 'holdings.md'), makeHoldings({ unmatched: 'none', weightPct: 75 }));
  const riskLimitPolicy = await evaluateExecutionPolicy({
    portfolioDir: dir,
    live: false,
    order: { symbol: 'AAA', conid: '1001', action: 'BUY', quantity: 1 },
  });
  assert(riskLimitPolicy.ok === false, 'Expected risk-limit breach to block execution');
  assert(riskLimitPolicy.blockers.some((item) => /Current holdings exceed max single ETF allocation/i.test(item)), 'Expected explicit risk-limit blocker');

  writeFile(path.join(dir, 'holdings.md'), makeHoldings({ unmatched: 'none', weightPct: 20 }));
  const staged = await stagePortfolioOrder({
    portfolioDir: dir,
    dryRun: true,
    order: { symbol: 'AAA', conid: '1001', action: 'BUY', quantity: 1, orderType: 'LMT', limitPrice: 1000, currency: 'CHF', exchange: 'SIX', secType: 'STK' },
  });
  assert(staged.ok === true, 'Expected safe dry-run staging to remain durable after closure hardening');

  console.log(JSON.stringify({ ok: true, unmatchedPolicy, riskLimitPolicy, staged: { ok: staged.ok, dryRun: staged.dryRun } }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
