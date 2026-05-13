'use strict';

const assert = require('assert');
const pricing = require('../src/brokers/interactive-brokers/pricing');
const instruments = require('../src/brokers/interactive-brokers/instruments');

assert.strictEqual(typeof pricing.fetchLatestPrice, 'function', 'Expected native pricing surface');
assert.strictEqual(typeof instruments.searchEtfInstruments, 'function', 'Expected native instrument search surface');
assert.strictEqual(Object.prototype.hasOwnProperty.call(pricing, 'loadBrowserSessionClient'), false, 'Did not expect browser-session loader in pricing');
assert.strictEqual(Object.prototype.hasOwnProperty.call(instruments, 'loadBrowserSessionClient'), false, 'Did not expect browser-session loader in instruments');

console.log(JSON.stringify({ ok: true }, null, 2));
