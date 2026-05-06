const fs = require('fs');
const os = require('os');
const path = require('path');
const { proposeTrades } = require('../src/analysis/tradeProposalEngine');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function preferBool(v) {
  return v ? 'true' : 'false';
}

function makePortfolio({ threshold = 'absolute drift > 5 percentage points or relative drift > 20%', minimumTradeSize = 500, preferCash = true, avoid = true, maxCashDrag = 25, turnoverLimit = 10 } = {}) {
  return `# Portfolio: demo

## Allocation Targets
| Asset class | Target % | Min % | Max % | Notes |
|---|---:|---:|---:|---|
| Global equities | 60 | 50 | 70 | |
| Swiss equities | 20 | 15 | 25 | |
| Bonds / cash-like | 20 | 10 | 30 | |

## Rebalancing Policy
- Rebalance threshold: ${threshold}
- Minimum trade size: CHF ${minimumTradeSize}
- Avoid unnecessary trades: ${preferBool(avoid)}
- Prefer using new cash before selling: ${preferBool(preferCash)}
- Avoid excessive turnover above: ${turnoverLimit}%

## Risk Limits
- Max cash drag after full deployment: ${maxCashDrag}%
`;
}

function makeHoldings({ cash = 2000, global = 2500, swiss = 500, bond = 0, total = 5000 } = {}) {
  return `# Holdings

## Snapshot
- Total value CHF: ${total}

## Current Holdings
| Currency | Ticker / ISIN | Asset class | Quantity | Price | FX | Value CHF | Weight % | Notes |
|---|---|---|---:|---:|---:|---:|---:|---|
| CHF | CASH-CHF | Cash | 1 | ${cash} | 1 | ${cash} | ${(cash / total * 100).toFixed(2)} | cash |
| USD | AAA | Global equities | 1 | ${global} | 1 | ${global} | ${(global / total * 100).toFixed(2)} | |
| CHF | BBB | Swiss equities | 1 | ${swiss} | 1 | ${swiss} | ${(swiss / total * 100).toFixed(2)} | |
| CHF | CCC | Bonds / cash-like | 1 | ${bond} | 1 | ${bond} | ${(bond / total * 100).toFixed(2)} | |
`;
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebalancing-closure-'));
  const portfolioPath = path.join(dir, 'portfolio.md');
  const holdingsPath = path.join(dir, 'holdings.md');

  fs.writeFileSync(portfolioPath, makePortfolio({ threshold: 'absolute drift > 50 percentage points or relative drift > 200%' }));
  fs.writeFileSync(holdingsPath, makeHoldings({ cash: 1000, global: 3000, swiss: 250, bond: 750, total: 5000 }));
  const minMax = proposeTrades({ portfolioPath, holdingsPath });
  assert(minMax.proposals.some((proposal) => proposal.assetClass === 'Swiss equities'), 'Expected min/max out-of-bounds underweight to remain actionable');
  assert(minMax.proposals.some((proposal) => proposal.forcedByBounds === true), 'Expected min/max breach proposal to be flagged');
  assert(minMax.notes.some((note) => /outside configured min\/max allocation bounds/i.test(note)), 'Expected min/max note');

  fs.writeFileSync(portfolioPath, makePortfolio({ threshold: 'absolute drift > 5 percentage points or relative drift > 20%', maxCashDrag: 10 }));
  fs.writeFileSync(holdingsPath, makeHoldings({ cash: 2000, global: 2000, swiss: 500, bond: 500, total: 5000 }));
  const cashDrag = proposeTrades({ portfolioPath, holdingsPath });
  assert(cashDrag.proposals.some((proposal) => /Cash drag remains above policy/i.test(proposal.blockedReason || '')), 'Expected explicit cash-drag blocker');
  assert(cashDrag.notes.some((note) => /cash-drag limit/i.test(note)), 'Expected cash-drag note');

  fs.writeFileSync(portfolioPath, makePortfolio({ threshold: 'absolute drift > 0.1 percentage points or relative drift > 1%', minimumTradeSize: 1, avoid: true, turnoverLimit: 1 }));
  fs.writeFileSync(holdingsPath, makeHoldings({ cash: 500, global: 2990, swiss: 980, bond: 530, total: 5000 }));
  const turnover = proposeTrades({ portfolioPath, holdingsPath });
  assert(turnover.proposals.filter((proposal) => /avoidable turnover/i.test(proposal.blockedReason || '')).length >= 2, 'Expected micro-turnover blockers on low-value proposals');
  assert(turnover.notes.some((note) => /avoidable turnover/i.test(note)), 'Expected turnover note');

  console.log(JSON.stringify({ ok: true, minMax, cashDrag, turnover }, null, 2));
}

main();
