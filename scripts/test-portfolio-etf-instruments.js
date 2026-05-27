const assert = require('assert');
const fs = require('fs');
const path = require('path');

const portfolioPath = path.join(process.cwd(), 'portfolio', 'etf', 'portfolio.md');
const text = fs.readFileSync(portfolioPath, 'utf8');

const required = [
  '| LU0950670850 | UBS MSCI United Kingdom UCITS ETF GBP acc | Global equities | 0 | 0 | 0 | EBS / IBKR-supported venue | GBP |',
  '| IE00B44T3H88 | HSBC MSCI China UCITS ETF USD | Global equities | 0 | 0 | 0 | LSEETF / IBKR-supported venue | USD |',
  '| IE00B5L8K969 | iShares MSCI EM Asia UCITS ETF (Acc) | Global equities | 0 | 0 | 0 | IBIS2 / IBKR-supported venue | EUR |',
  '| IE00B4L5YX21 | iShares Core MSCI Japan IMI UCITS ETF | Global equities | 0 | 0 | 0 | LSE / IBKR-supported venue | USD |',
  '| IE00B53SZB19 | NASDAQ | Nasdaq 100 | iShares Nasdaq 100 UCITS ETF (Acc) | 0.30% | physical | USD | research-only | Best low-TER physical UCITS Nasdaq 100 candidate from the sources checked. |',
  '| XS2940466316 | Crypto | Bitcoin ETP | iShares Bitcoin ETP | 0.15% temporary / 0.25% standard | physically backed ETP | USD | research-only | Suitable Europe/Switzerland-friendly Bitcoin alternative to US IBIT for future consideration; not UCITS and not in the ETF-only MVP lane. |',
  'physical replication',
  'physically backed ETP',
  'ibkr_symbol=SXR8',
  'ibkr_conid=75776072',
  'not in the ETF-only MVP lane',
];

for (const needle of required) {
  assert(text.includes(needle), `Expected portfolio contract to include: ${needle}`);
}

console.log(JSON.stringify({ ok: true, required: required.length }, null, 2));
