'use strict';

const assert = require('assert');
const { buildRequestOptions } = require('../src/brokers/interactive-brokers/client');

const local = buildRequestOptions('https://localhost:5000/v1/api/tickle');
assert(local.agent, 'Expected localhost https request to use scoped agent');
assert.strictEqual(local.method, 'GET');

const localIp = buildRequestOptions('https://127.0.0.1:5000/v1/api/tickle', { method: 'POST', body: { ok: true } });
assert(localIp.agent, 'Expected 127.0.0.1 https request to use scoped agent');
assert.strictEqual(localIp.method, 'POST');
assert.strictEqual(localIp.body, JSON.stringify({ ok: true }));

const remote = buildRequestOptions('https://example.com/api');
assert(!remote.agent, 'Expected remote https request to avoid scoped insecure agent');

const httpLocal = buildRequestOptions('http://localhost:5000/v1/api/tickle');
assert(!httpLocal.agent, 'Expected plain http request to avoid TLS agent');

assert.strictEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, undefined, 'Expected no global TLS env mutation');

console.log(JSON.stringify({ ok: true }, null, 2));
