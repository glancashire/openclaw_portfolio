const assert = require('assert');
const fs = require('fs');
const path = require('path');

const portfolioPath = path.join(process.cwd(), 'portfolio', 'etf', 'portfolio.md');
const text = fs.readFileSync(portfolioPath, 'utf8');

const required = [
  '| LU0950670850 | UBS MSCI United Kingdom UCITS ETF GBP acc | Global equities | 0 | 0 | 0 | LSE / IBKR-supported venue | GBP | Future candidate for UK sleeve; physical replication; ETF should be verified in IBKR before allocation; ibkr_symbol=UK; ibkr_conid=missing; ibkr_primary_exchange=missing; fx_to_chf=1.15 |',
  '| IE00B44T3H88 | HSBC MSCI China UCITS ETF USD | Global equities | 0 | 0 | 0 | LSE / IBKR-supported venue | USD | Future candidate for China sleeve; physical replication; verify IBKR symbol/conid before any use; ibkr_symbol=missing; ibkr_conid=missing; fx_to_chf=0.88 |',
  '| IE00B5L8K969 | iShares MSCI EM Asia UCITS ETF (Acc) | Global equities | 0 | 0 | 0 | LSE / IBKR-supported venue | USD | Future candidate for Asia sleeve; physical replication; verify IBKR symbol/conid before any use; ibkr_symbol=missing; ibkr_conid=missing; fx_to_chf=0.88 |',
  '| IE00B4L5YX21 | iShares Core MSCI Japan IMI UCITS ETF | Global equities | 0 | 0 | 0 | LSE / IBKR-supported venue | USD | Future candidate for Japan sleeve; physical replication; verify IBKR symbol/conid before any use; ibkr_symbol=missing; ibkr_conid=missing; fx_to_chf=0.88 |',
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
