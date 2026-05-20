const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ubspx-primary-'));
fs.writeFileSync(path.join(tmp, 'portfolio.md'), `# Test Portfolio\n\n- Status: active\n- Execution mode: require_confirmation\n- Broker account reference: UTEST\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Venue preference | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| IE00BD4TXW66 | UBS Core S&P 500 UCITS ETF USD acc | Global equities | 40 | 30 | 50 | IBIS / SMART | EUR | ibkr_symbol=UBSPX; ibkr_local_symbol=BCFT; ibkr_conid=808613958; ibkr_primary_exchange=IBIS; fx_to_chf=0.96 |\n`);
const instruments = readApprovedInstruments(path.join(tmp, 'portfolio.md'));
assert.strictEqual(instruments[0].ibkrPrimaryExchange, 'IBIS');
assert.strictEqual(instruments[0].ibkrLocalSymbol, 'BCFT');
const order = { symbol: 'UBSPX', conid: '808613958' };
if (!order.primaryExchange && instruments[0].ibkrPrimaryExchange) order.primaryExchange = instruments[0].ibkrPrimaryExchange;
if (!order.localSymbol && instruments[0].ibkrLocalSymbol) order.localSymbol = instruments[0].ibkrLocalSymbol;
if (!order.exchange) order.exchange = 'SMART';
assert.strictEqual(order.primaryExchange, 'IBIS');
assert.strictEqual(order.localSymbol, 'BCFT');
assert.strictEqual(order.exchange, 'SMART');
console.log(JSON.stringify({ ok: true, instrument: instruments[0], order }, null, 2));
