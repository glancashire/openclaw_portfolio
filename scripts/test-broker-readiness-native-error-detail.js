'use strict';

const assert = require('assert');
const { summarizeReadiness } = require('../src/brokers/interactive-brokers/readiness');

{
  const result = summarizeReadiness({
    config: { ok: true },
    auth: {
      ok: false,
      reason: 'native_error',
      error: 'IB Gateway not connected',
      diagnostics: { detail: 'IB Gateway not connected' },
    },
  });
  assert.strictEqual(result.reason, 'native_error');
  assert.match(result.guidance, /IB Gateway not connected/);
  assert.match(result.message, /IB Gateway not connected/);
}

console.log(JSON.stringify({ ok: true }, null, 2));
