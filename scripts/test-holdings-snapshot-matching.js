const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { writeHoldingsSnapshot } = require('../src/brokers/shared/holdingsSnapshot');

const portfolioDir = path.resolve('/tmp/test-holdings-snapshot-matching');
fs.mkdirSync(portfolioDir, { recursive: true });
fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: test\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | Global equities | 20 | 10 | 30 | Xetra | EUR | ibkr_symbol=EMUAA; ibkr_conid=243939970 |\n| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | Swiss equities | 20 | 10 | 30 | SIX | CHF | ibkr_symbol=UBSSLI; ibkr_conid=150029461 |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n| none | n/a |\n`);

const result = writeHoldingsSnapshot({
  portfolioDir,
  source: 'broker_api',
  holdings: [
    { identifier: '243939970', ticker: 'EMUAA', name: 'EMUAA', quantity: 26, price: 39.81, currency: 'EUR', marketValue: 1035.08 },
    { identifier: '12087817', ticker: 'EUR.CHF', name: 'EUR.CHF', quantity: 0, price: 0, currency: 'CHF', marketValue: 0 },
  ],
  cashChf: 4048.26,
});

const text = fs.readFileSync(result.outPath, 'utf8');
assert(text.includes('| 243939970 | EMUAA | Global equities | 26 | 39.81 | EUR |  | 1035.08 | 0 | 0 | 0 |'), 'Expected EMUAA row to inherit approved asset class');
assert(text.includes('- All holdings matched to approved instruments: yes'), 'Expected holdings to be treated as matched');
assert(text.includes('- Unmatched holdings: none'), 'Expected unmatched holdings to be none');
console.log(JSON.stringify({ ok: true }, null, 2));
