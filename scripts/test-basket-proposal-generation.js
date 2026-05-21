const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { generateBasketProposal, computePriceBand, normalizeProposalLeg } = require('../src/execution/basketProposalStore');

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'basket-proposal-'));
  const portfolioDir = path.join(dir, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ETF\n\n## Status\n- Status: active\n- Execution mode: transmitted_live\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| IE00B5BMR087 | iShares Core S&P 500 UCITS ETF USD (Acc) | Global equities | 40 | 30 | 50 | IBIS2 / SMART | EUR | ibkr_symbol=SXR8; ibkr_conid=75776072; ibkr_primary_exchange=IBIS2 |\n| LU0950668870 | Amundi MSCI EM UCITS ETF Acc | Global equities | 15 | 10 | 20 | Xetra / SMART | EUR | ibkr_symbol=EMUAA; ibkr_conid=243939970; ibkr_primary_exchange=XETRA |\n`);

  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), `# Holdings\n\n- Total value CHF: 20000\n- Cash CHF: 20000\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Market price | Market value | Currency | Value CHF |\n|---|---|---|---:|---:|---:|---|---:|\n| CASH-CHF | CHF cash | Cash | 20000 | 1.00 | 20000.00 | CHF | 20000.00 |\n`);

  const proposalInput = {
    proposals: [
      {
        instrument: 'IE00B5BMR087',
        instrumentName: 'iShares Core S&P 500 UCITS ETF USD (Acc)',
        assetClass: 'Global equities',
        action: 'buy',
        quantity: 2,
        limitPrice: 689.2,
        estimatedOrderChf: 1374.36,
        residualCashChf: 12.5,
        rationale: 'Deploy available cash toward underweight global equities using SXR8.',
        riskNote: 'Dry-run proposal only.',
        priceSource: 'interactive-brokers-marketdata',
        allocationTargetPct: 40,
        allocationBeforePct: 0,
        allocationAfterPct: 6.87,
        blocked: false,
      },
      {
        instrument: 'UNKNOWN',
        instrumentName: 'Unknown Instrument',
        assetClass: 'Global equities',
        action: 'buy',
        quantity: 1,
        limitPrice: 10,
        estimatedOrderChf: 10,
        residualCashChf: 0,
        rationale: 'Should be blocked because identity is unresolved.',
        riskNote: 'Blocked case.',
        priceSource: 'draft',
        allocationTargetPct: 0,
        allocationBeforePct: 0,
        allocationAfterPct: 0,
        blocked: true,
      }
    ],
    notes: ['Used available CHF cash before considering any sell-driven rebalance moves.'],
    proposalWarnings: ['1 proposal remains blocked by policy checks.'],
    residualCashChf: 12.5,
  };

  const result = await generateBasketProposal({ portfolioPath: path.join(portfolioDir, 'portfolio.md'), holdingsPath: path.join(portfolioDir, 'holdings.md'), portfolio: 'etf', rootDir: dir, now: new Date('2026-05-21T22:45:00Z'), proposalInput });
  assert(fs.existsSync(result.path));
  assert.strictEqual(result.proposal.portfolio, 'etf');
  assert(Array.isArray(result.proposal.legs));
  assert.strictEqual(result.proposal.legs.length, 2);
  assert.strictEqual(result.proposal.summary.blockedLegCount, 1);
  assert.strictEqual(result.proposal.summary.executableLegCount, 1);
  const leg = result.proposal.legs[0];
  assert(leg.priceBand.upperBound >= leg.priceBand.lowerBound);
  assert(leg.execution);
  assert.strictEqual(leg.execution.exchange, 'SMART');
  assert.strictEqual(leg.execution.primaryExchange, 'IBIS2');

  const band = computePriceBand({ limitPrice: 100, currency: 'EUR', priceSource: 'live' });
  assert.strictEqual(band.lowerBound, 99.5);
  assert.strictEqual(band.upperBound, 100.5);

  const norm = normalizeProposalLeg({ instrument: 'IE00B5BMR087', action: 'BUY', quantity: 2, limitPrice: 689.2, currency: 'EUR' }, { ibkrSymbol: 'SXR8', ibkrConid: '75776072', ibkrPrimaryExchange: 'IBIS2', currency: 'EUR' }, 0);
  assert.strictEqual(norm.blocked, false);
  assert.strictEqual(norm.execution.primaryExchange, 'IBIS2');

  const blocked = normalizeProposalLeg({ instrument: 'UNKNOWN', action: 'BUY', quantity: 1, limitPrice: 1, currency: 'EUR', blocked: true }, null, 1);
  assert.strictEqual(blocked.blocked, true);
  assert(blocked.blockedReasons.length > 0);

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
