const assert = require('assert');
const { summarizeContractIntelligence } = require('../src/reporting/contractIntelligenceStatus');
const { buildContractIntelligenceQueueItems } = require('../src/reporting/dashboardGenerator');

const summary = summarizeContractIntelligence([
  { tickerOrIsin: 'CH001', name: 'Ready ETF', exchange: 'EBS', currency: 'CHF', ibkrConid: '123', ibkrSymbol: 'READY', metadata: {} },
  { tickerOrIsin: 'CH002', name: 'Missing conid ETF', exchange: 'EBS', currency: 'CHF', ibkrConid: null, ibkrSymbol: 'NOCONID', metadata: {} },
  { tickerOrIsin: 'CH003', name: 'Missing symbol ETF', exchange: 'LSEETF', currency: 'USD', ibkrConid: '456', ibkrSymbol: null, metadata: {} },
  { tickerOrIsin: 'CH004', name: 'Missing venue ETF', exchange: '', currency: 'EUR', ibkrConid: '789', ibkrSymbol: 'NOVENUE', metadata: {} },
]);

assert.strictEqual(summary.total, 4);
assert.strictEqual(summary.readyCount, 1);
assert.strictEqual(summary.missingConidCount, 1);
assert.strictEqual(summary.missingSymbolCount, 1);
assert.strictEqual(summary.missingVenueCount, 1);
assert(/missing conid: 1/i.test(summary.summaryLine));
assert(/Resolve missing IBKR conids/i.test(summary.nextAction));
assert.strictEqual(summary.examples.missingConid[0].tickerOrIsin, 'CH002');

const queueItems = buildContractIntelligenceQueueItems(summary);
assert(queueItems.length >= 3, 'Expected queue items for each contract identity gap class');
assert(queueItems.some((item) => /missing IBKR conids/i.test(item.summary)));
assert(queueItems.some((item) => /missing IBKR symbols/i.test(item.summary)));
assert(queueItems.some((item) => /missing venue identity/i.test(item.summary)));

console.log(JSON.stringify({ ok: true }, null, 2));
