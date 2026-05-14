const assert = require('assert');
const { normalizeContractIntelligence, pickBestContractIntelligence, rankContractMatch } = require('../src/brokers/interactive-brokers/contractIntelligence');
const { normalizeSearchResults } = require('../src/brokers/interactive-brokers/instruments');

const normalized = normalizeContractIntelligence({
  contract: {
    conId: 243939970,
    symbol: 'EMUAA',
    localSymbol: 'EMUAA',
    primaryExch: 'LSEETF',
    exchange: 'SMART',
    currency: 'EUR',
    secType: 'STK',
    isin: 'LU0950668870',
  },
  longName: 'UBS ETF (LU) MSCI EMU UCITS ETF',
  marketName: 'ETF',
});
assert.strictEqual(normalized.conid, 243939970);
assert.strictEqual(normalized.localSymbol, 'EMUAA');
assert.strictEqual(normalized.primaryExch, 'LSEETF');
assert.strictEqual(normalized.venue, 'LSEETF');
assert.strictEqual(normalized.venueKey, 'STK::EUR::LSEETF');
assert.strictEqual(normalized.isin, 'LU0950668870');

const searchRows = normalizeSearchResults([{ conid: '150029461', symbol: 'UBSSLI', description: 'UBS SLI ETF', listingExchange: 'EBS', currency: 'CHF', secType: 'STK' }]);
assert.strictEqual(searchRows[0].conid, 150029461);
assert.strictEqual(searchRows[0].exchange, 'EBS');
assert.strictEqual(searchRows[0].venueKey, 'STK::CHF::EBS');

const instrument = { ibkrSymbol: 'UBSSLI', currency: 'CHF', exchange: 'EBS', tickerOrIsin: 'CH0032912732' };
const weak = { conid: 1, symbol: 'UBSSLI', localSymbol: null, primaryExch: null, exchange: 'SMART', currency: 'USD', isin: null };
const strong = { conid: 2, symbol: 'UBSSLI', localSymbol: 'UBSSLI', primaryExch: 'EBS', exchange: 'SMART', currency: 'CHF', isin: 'CH0032912732' };
assert(rankContractMatch(strong, instrument) > rankContractMatch(weak, instrument));
assert.strictEqual(pickBestContractIntelligence([weak, strong], instrument), strong);

console.log(JSON.stringify({ ok: true }, null, 2));
