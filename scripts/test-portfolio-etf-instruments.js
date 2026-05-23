const assert = require('assert');
const fs = require('fs');
const path = require('path');

const portfolioPath = path.join(process.cwd(), 'portfolio', 'etf', 'portfolio.md');
const text = fs.readFileSync(portfolioPath, 'utf8');

const required = [
  '| LU0950670850 | UBS MSCI United Kingdom UCITS ETF GBP acc | Global equities | 0 | 0 | 0 | LSE / IBKR-supported venue | GBP | Future candidate for UK sleeve',
  '| IE00B44T3H88 | HSBC MSCI China UCITS ETF USD | Global equities | 0 | 0 | 0 | LSE / IBKR-supported venue | USD | Future candidate for China sleeve',
  '| IE00B5L8K969 | iShares MSCI EM Asia UCITS ETF (Acc) | Global equities | 0 | 0 | 0 | LSE / IBKR-supported venue | USD | Future candidate for Asia sleeve',
  '| IE00B4L5YX21 | iShares Core MSCI Japan IMI UCITS ETF | Global equities | 0 | 0 | 0 | LSE / IBKR-supported venue | USD | Future candidate for Japan sleeve',
  '| IE00B53SZB19 | NASDAQ | Nasdaq 100 | iShares Nasdaq 100 UCITS ETF (Acc) | 0.30% | physical | USD | needs IBKR verification | Best low-TER physical UCITS Nasdaq 100 candidate',
  'physical replication',
  'ibkr_symbol=SXR8',
  'ibkr_conid=75776072',
];

for (const needle of required) {
  assert(text.includes(needle), `Expected portfolio contract to include: ${needle}`);
}

console.log(JSON.stringify({ ok: true, required: required.length }, null, 2));
