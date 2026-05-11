'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { evaluateMarketOpenBlock } = require('../src/execution/marketOpenPolicy');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const buyTrade = { action: 'BUY' };
  const policy = { avoidBuyingAfterExtremeDailyMoves: true };

  const noQuote = evaluateMarketOpenBlock({ trade: buyTrade, quote: null, marketEntryPolicy: policy });
  assert(noQuote.blocked === true, 'expected no-quote case to block');
  assert(noQuote.blockCode === 'quote_unavailable', `unexpected block code: ${noQuote.blockCode}`);

  const surgeQuote = { close: 100, last: 104, bid: 103.5, ask: 104.2 };
  const surge = evaluateMarketOpenBlock({ trade: buyTrade, quote: surgeQuote, marketEntryPolicy: policy });
  assert(surge.blocked === true, 'expected surge case to block');
  assert(surge.blockCode === 'trend_guard_blocked', `unexpected surge code: ${surge.blockCode}`);

  const fallbackQuote = { close: 100, last: null, bid: null, ask: null };
  const fallback = evaluateMarketOpenBlock({ trade: buyTrade, quote: fallbackQuote, marketEntryPolicy: policy });
  assert(fallback.blocked === false, 'expected delayed-close fallback to stay executable');
  assert(Number.isFinite(fallback.limitPrice), 'expected fallback limit price');

  const unusableQuote = { close: null, last: null, bid: null, ask: null };
  const unusable = evaluateMarketOpenBlock({ trade: buyTrade, quote: unusableQuote, marketEntryPolicy: policy });
  assert(unusable.blocked === true, 'expected unusable quote to block');
  assert(unusable.blockCode === 'pricing_reference_unavailable', `unexpected unusable code: ${unusable.blockCode}`);
  assert(/no usable live or delayed reference price fields/i.test(unusable.blockReason), 'expected clearer unusable quote reason');

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'market-open-entitlement-'));
  const portfolioDir = path.join(fixtureRoot, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: ETF\n\n## Status\n- Status: active\n- Broker account reference: UTEST123\n- Execution mode: transmitted_live\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| IE00B5BMR087 | iShares Core S&P 500 UCITS ETF USD (Acc) | Global equities | 100 | 0 | 100 | LSE / IBKR-supported venue | USD | ibkr_symbol=CSPX; ibkr_conid=76023663; fx_to_chf=1 |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n| none | none |\n\n## Market Entry Policy\n- Avoid buying after extreme daily price moves: true\n`);
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades: ETF\n\n## Trade Log\n\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-10 10:30:00 | approved | buy | IE00B5BMR087 | iShares Core S&P 500 UCITS ETF USD (Acc) | 1 | 100 | 100 | 0 | approved row | queued_for_open_runner |  |  |  |  |  |\n`);

  execFileSync('node', ['scripts/submit-orders-at-open.js', portfolioDir, '--dry-run'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_OPTIONS: `--require ${path.join(process.cwd(), 'scripts/test-stubs/mock-ibkr-entitlement-failure.js')}`,
    },
    stdio: 'pipe',
  });

  const updated = fs.readFileSync(path.join(portfolioDir, 'trades.md'), 'utf8');
  assert(updated.includes('market_data_entitlement_required'), 'expected entitlement block code persisted');
  assert(updated.includes('Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.'), 'expected entitlement block reason persisted');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
