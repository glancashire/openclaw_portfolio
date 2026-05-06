const fs = require('fs');
const os = require('os');
const path = require('path');
const { proposeTrades } = require('../src/analysis/tradeProposalEngine');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makePortfolio({ threshold = 'absolute drift > 5 percentage points or relative drift > 20%', minimumTradeSize = 500, preferCash = true, avoid = true } = {}) {
  return `# Portfolio: demo\n\n## Allocation Targets\n| Asset class | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Global equities | 70 | 60 | 80 | |\n| Swiss equities | 30 | 20 | 40 | |\n\n## Rebalancing Policy\n- Rebalance threshold: ${threshold}\n- Minimum trade size: CHF ${minimumTradeSize}\n- Avoid unnecessary trades: ${preferBool(avoid)}\n- Prefer using new cash before selling: ${preferBool(preferCash)}\n`;
}

function preferBool(v) {
  return v ? 'true' : 'false';
}

function makeHoldings({ cash = 1000, global = 3500, swiss = 500, total = 5000 } = {}) {
  return `# Holdings\n\n## Snapshot\n- Total value CHF: ${total}\n\n## Current Holdings\n| Currency | Ticker / ISIN | Asset class | Quantity | Price | FX | Value CHF | Weight % | Notes |\n|---|---|---|---:|---:|---:|---:|---:|---|\n| CHF | CASH-CHF | Cash | 1 | ${cash} | 1 | ${cash} | 20 | cash |\n| USD | AAA | Global equities | 1 | ${global} | 1 | ${global} | 70 | |\n| CHF | BBB | Swiss equities | 1 | ${swiss} | 1 | ${swiss} | 10 | |\n`;
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rebalancing-hardening-'));
  const portfolioPath = path.join(dir, 'portfolio.md');
  const holdingsPath = path.join(dir, 'holdings.md');

  fs.writeFileSync(portfolioPath, makePortfolio());
  fs.writeFileSync(holdingsPath, makeHoldings());
  const aboveThreshold = proposeTrades({ portfolioPath, holdingsPath });
  assert(aboveThreshold.proposals.length === 1, 'Expected one threshold-breaching underweight proposal');
  assert(aboveThreshold.proposals[0].assetClass === 'Swiss equities', 'Expected Swiss equities proposal');
  assert(aboveThreshold.proposals[0].fundingSource === 'cash', 'Expected cash funding source');
  assert(/Using available cash before considering sells/i.test(aboveThreshold.proposals[0].rationale), 'Expected cash-first rationale');
  assert(aboveThreshold.notes.some((note) => /cash before considering any sell-driven rebalance moves/i.test(note)), 'Expected cash-first note');

  fs.writeFileSync(portfolioPath, makePortfolio({ threshold: 'absolute drift > 25 percentage points or relative drift > 80%' }));
  const belowThreshold = proposeTrades({ portfolioPath, holdingsPath });
  assert(belowThreshold.proposals.length === 0, 'Expected no proposal when drift stays within threshold');
  assert(belowThreshold.notes.some((note) => /within the configured rebalance threshold/i.test(note)), 'Expected threshold note');

  fs.writeFileSync(portfolioPath, makePortfolio({ minimumTradeSize: 1200 }));
  const belowMinimum = proposeTrades({ portfolioPath, holdingsPath });
  assert(belowMinimum.proposals.length === 1, 'Expected proposal to remain visible when below minimum');
  assert(belowMinimum.proposals[0].blocked === true, 'Expected below-minimum proposal to be blocked');
  assert(/Below minimum trade size of CHF 1200/i.test(belowMinimum.proposals[0].blockedReason), 'Expected explicit blocked reason');
  assert(belowMinimum.notes.some((note) => /below the configured minimum trade size/i.test(note)), 'Expected minimum-size note');

  console.log(JSON.stringify({
    ok: true,
    aboveThreshold,
    belowThreshold,
    belowMinimum,
  }, null, 2));
}

main();
