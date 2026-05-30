'use strict';

const assert = require('assert');
const path = require('path');
const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
const { mapExternalQuoteSymbol } = require('../src/reporting/quoteResolution');

(function main() {
  const instruments = readApprovedInstruments(path.join(__dirname, '..', 'portfolio', 'etf', 'portfolio.md'));
  const emuaa = instruments.find((row) => row.tickerOrIsin === 'LU0950668870');
  assert.ok(emuaa, 'Expected EMUAA approved instrument row');
  assert.strictEqual(emuaa.ibkrSymbol, 'EMUAA');
  assert.strictEqual(emuaa.ibkrConid, '243939970');
  assert.strictEqual(emuaa.ibkrPrimaryExchange, 'IBIS2');
  assert.strictEqual(emuaa.externalQuoteSymbol, 'EMUAA.SW');
  assert.strictEqual(mapExternalQuoteSymbol(emuaa), 'EMUAA.SW');

  const heuristic = mapExternalQuoteSymbol({ ibkrSymbol: 'SXR8', ibkrPrimaryExchange: 'IBIS2' });
  assert.strictEqual(heuristic, 'SXR8.DE');

  console.log(JSON.stringify({ ok: true, emuaaExternalQuoteSymbol: emuaa.externalQuoteSymbol, heuristic }, null, 2));
})();
