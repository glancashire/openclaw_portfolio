const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
const { writeHoldingsSnapshot } = require('../src/brokers/shared/holdingsSnapshot');
const { normaliseHolding } = require('../src/brokers/interactive-brokers/types');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'holdings-map-'));
fs.writeFileSync(path.join(tmp, 'portfolio.md'), `# Portfolio\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | Swiss equities | 20 | 10 | 30 | SIX | CHF | ibkr_symbol=UBSSLI; ibkr_conid=150029461; fx_to_chf=1 |\n| IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | Global equities | 40 | 30 | 50 | IBIS / SMART | EUR | ibkr_symbol=UBSPX; ibkr_local_symbol=BCFT; ibkr_conid=808613958; ibkr_primary_exchange=IBIS; fx_to_chf=0.96 |\n`);

const approved = readApprovedInstruments(path.join(tmp, 'portfolio.md'));
assert.strictEqual(approved[0].ibkrConid, '150029461');
assert.strictEqual(approved[1].ibkrLocalSymbol, 'BCFT');

const swiss = normaliseHolding({
  contract: { conId: 150029461, symbol: 'CHSPI', localSymbol: 'CHSPI', currency: 'CHF', exchange: 'EBS' },
  position: 16,
  mktPrice: 161.22915,
  mktValue: 2579.6664,
  description: 'UBS SLI ETF (SMI gleichgewichtet)',
});
assert.strictEqual(swiss.identifier, 150029461);
assert.strictEqual(swiss.ticker, 'CHSPI');

const result = writeHoldingsSnapshot({
  portfolioDir: tmp,
  holdings: [swiss],
  cashChf: 100,
  source: 'test',
  broker: 'interactive-brokers',
  normaliseHolding: (h) => h,
});

const out = fs.readFileSync(path.join(tmp, 'holdings.md'), 'utf8');
assert.ok(out.includes('| 150029461 | UBS SLI ETF (SMI gleichgewichtet) | Swiss equities |'));
assert.ok(out.includes('- All holdings matched to approved instruments: yes'));
console.log(JSON.stringify({ ok: true, outPath: result.outPath }, null, 2));
