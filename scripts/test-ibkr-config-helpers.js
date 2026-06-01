'use strict';

const assert = require('assert');
const {
  IBKR_DEFAULTS,
  getDefaultNativePort,
  getDefaultBaseUrl,
  isLoopbackHostname,
  shouldUseInsecureLoopbackTls,
} = require('../src/brokers/interactive-brokers/config');

assert.strictEqual(IBKR_DEFAULTS.mode, 'native');
assert.strictEqual(IBKR_DEFAULTS.runtime, 'live');
assert.strictEqual(IBKR_DEFAULTS.host, '127.0.0.1');
assert.strictEqual(IBKR_DEFAULTS.clientId, 101);
assert.strictEqual(IBKR_DEFAULTS.readonlyClientId, 150);
assert.strictEqual(getDefaultNativePort('live'), 4001);
assert.strictEqual(getDefaultNativePort('paper'), 4002);
assert.strictEqual(getDefaultNativePort('weird'), 4001);
assert.strictEqual(getDefaultBaseUrl(), 'https://localhost:5000/v1/api');
assert.strictEqual(getDefaultBaseUrl('portal'), 'https://localhost:5000/portal.proxy/v1/api');
assert.strictEqual(getDefaultBaseUrl('weird'), 'https://localhost:5000/v1/api');

assert.strictEqual(isLoopbackHostname('localhost'), true);
assert.strictEqual(isLoopbackHostname('LOCALHOST'), true);
assert.strictEqual(isLoopbackHostname('127.0.0.1'), true);
assert.strictEqual(isLoopbackHostname('::1'), true);
assert.strictEqual(isLoopbackHostname('example.com'), false);
assert.strictEqual(isLoopbackHostname('192.168.1.10'), false);
assert.strictEqual(isLoopbackHostname(''), false);

assert.strictEqual(shouldUseInsecureLoopbackTls('https://localhost:5000/v1/api/tickle'), true);
assert.strictEqual(shouldUseInsecureLoopbackTls('https://LOCALHOST:5000/v1/api/tickle'), true);
assert.strictEqual(shouldUseInsecureLoopbackTls('https://127.0.0.1:5000/v1/api/tickle'), true);
assert.strictEqual(shouldUseInsecureLoopbackTls('https://[::1]:5000/v1/api/tickle'), true);
assert.strictEqual(shouldUseInsecureLoopbackTls('https://example.com/v1/api/tickle'), false);
assert.strictEqual(shouldUseInsecureLoopbackTls('https://192.168.1.10:5000/v1/api/tickle'), false);
assert.strictEqual(shouldUseInsecureLoopbackTls('http://localhost:5000/v1/api/tickle'), false);
assert.strictEqual(shouldUseInsecureLoopbackTls('not a url'), false);

console.log(JSON.stringify({ ok: true }, null, 2));
