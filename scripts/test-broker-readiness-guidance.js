'use strict';

const assert = require('assert');
const { summarizeReadiness } = require('../src/brokers/interactive-brokers/readiness');

{
  const result = summarizeReadiness({
    config: { ok: true },
    auth: { ok: true, mode: 'native-socket' },
    marketData: {
      posture: 'unknown',
      detail: 'approved instrument IE00BD4TXW66: market data request returned no usable price fields',
      probe: { conid: '808613958', label: 'approved instrument IE00BD4TXW66', source: 'approved_instrument' },
    },
  });
  assert.strictEqual(result.mode, 'native-socket');
  assert.strictEqual(result.portalSessionState, 'unknown_or_separate');
  assert.strictEqual(result.marketDataMode, 'unknown');
  assert.match(result.guidance, /Prefer native raw contract details/i);
  assert.strictEqual(result.marketDataProbe.conid, '808613958');
}

{
  const result = summarizeReadiness({
    config: { ok: true },
    auth: { ok: true, mode: 'native-socket' },
    marketData: {
      posture: 'live_or_realtime',
      detail: 'Live/realtime bid/ask/last values are available via approved instrument EMUAA.',
      probe: { conid: '243939970', label: 'approved instrument LU0950668870', source: 'approved_instrument' },
    },
  });
  assert.strictEqual(result.fallbackRequired, false);
  assert.strictEqual(result.portalSessionState, 'unknown_or_separate');
  assert.match(result.guidance, /Broker path is healthy/i);
}


{
  const result = summarizeReadiness({
    config: { ok: true },
    auth: { ok: true, mode: 'native-socket' },
    marketData: {
      posture: 'delayed_only',
      detail: 'Interactive Brokers reports delayed market data is available via approved instrument EMUAA.',
      probe: { conid: '243939970', label: 'approved instrument LU0950668870', source: 'approved_instrument' },
    },
  });
  assert.strictEqual(result.fallbackRequired, true);
  assert.strictEqual(result.reason, 'delayed_data_only');
  assert.match(result.guidance, /common outside market hours/i);
  assert.match(result.message, /delayed-only \(common outside market hours\)/i);
}

console.log(JSON.stringify({ ok: true }, null, 2));
