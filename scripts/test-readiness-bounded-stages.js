#!/usr/bin/env node
'use strict';

/* Phase Cleanup-1C regression: bounded readiness splits auth + posture
 * stages so the dashboard distinguishes 'broker reachable but posture
 * undetermined' from 'broker unreachable / readiness timed out'.
 */

const assert = require('assert');
const {
  runStagedReadiness,
  buildReadinessTimeoutFallback,
  buildPostureDetectionTimeoutFallback,
  getInteractiveBrokersReadinessBounded,
} = require('../src/brokers/interactive-brokers/readiness');

let passed = 0;
async function test(name, fn) {
  try { await fn(); passed++; } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

function makeStubClient(overrides = {}) {
  return () => ({
    configurationStatus: () => ({ ok: true }),
    authenticate: overrides.authenticate || (async () => ({ ok: true, mode: 'native-socket' })),
  });
}

(async () => {
  await test('auth timeout returns legacy readiness timeout fallback', async () => {
    const result = await runStagedReadiness({
      buildClient: makeStubClient(),
      authenticate: async () => new Promise(() => {}), // never resolves
      authTimeoutMs: 25,
      postureTimeoutMs: 25,
    });
    assert.strictEqual(result.stage, 'auth_timeout');
    const fallback = buildReadinessTimeoutFallback();
    assert.strictEqual(fallback.reason, 'timeout');
    assert.strictEqual(fallback.fallbackRequired, true);
    assert.match(fallback.message, /timed out/i);
    assert.strictEqual(fallback.operatorState.code, 'ibkr_readiness_timeout');
  });

  await test('posture timeout returns reachable+degraded fallback (Phase Cleanup-1C)', async () => {
    const result = await runStagedReadiness({
      buildClient: makeStubClient(),
      authenticate: async () => ({ ok: true, mode: 'native-socket' }),
      posture: async () => new Promise(() => {}), // posture never resolves
      authTimeoutMs: 200,
      postureTimeoutMs: 25,
    });
    assert.strictEqual(result.stage, 'posture_timeout');
    const fallback = buildPostureDetectionTimeoutFallback({ auth: result.auth });
    assert.strictEqual(fallback.reason, 'posture_detection_timeout');
    assert.strictEqual(fallback.fallbackRequired, true);
    assert.strictEqual(fallback.authenticated, true);
    assert.strictEqual(fallback.reachable, true);
    assert.strictEqual(fallback.marketDataMode, 'unknown');
    assert.strictEqual(fallback.operatorState.code, 'broker_reachable_posture_undetermined');
    assert(!/timed out/i.test(fallback.message), 'message must NOT say "timed out"');
    assert.match(fallback.message, /reachable/i);
    assert.match(fallback.message, /posture is degraded/i);
  });

  await test('auth failure flows through summarizeReadiness path', async () => {
    const result = await runStagedReadiness({
      buildClient: makeStubClient(),
      authenticate: async () => ({ ok: false, error: 'connect ECONNREFUSED 127.0.0.1:4001' }),
      authTimeoutMs: 200,
      postureTimeoutMs: 200,
    });
    assert.strictEqual(result.stage, 'auth_failed');
    assert.strictEqual(result.auth.ok, false);
  });

  await test('happy path resolves with marketData', async () => {
    const result = await runStagedReadiness({
      buildClient: makeStubClient(),
      authenticate: async () => ({ ok: true, mode: 'native-socket' }),
      posture: async () => ({ posture: 'live_or_realtime', detail: 'all good' }),
      authTimeoutMs: 200,
      postureTimeoutMs: 200,
    });
    assert.strictEqual(result.stage, 'resolved');
    assert.strictEqual(result.marketData.posture, 'live_or_realtime');
  });

  await test('bounded wrapper routes posture timeout to new fallback', async () => {
    // Deterministically force the posture-timeout path via injected hooks:
    // auth resolves fast/ok, posture never resolves so the posture budget wins.
    // (Previously this used a 1ms real budget, which was environment-dependent:
    // in a gateway-down env auth fails fast → native_error instead of a timeout.)
    const out = await getInteractiveBrokersReadinessBounded({
      portfolio: 'etf',
      buildClient: makeStubClient(),
      authenticate: async () => ({ ok: true, mode: 'native-socket' }),
      posture: async () => new Promise(() => {}), // never resolves → posture timeout
      authTimeoutMs: 25,
      postureTimeoutMs: 25,
    });
    assert.strictEqual(out.fallbackRequired, true);
    assert.strictEqual(out.reason, 'posture_detection_timeout',
      `expected posture_detection_timeout, got: ${out.reason}`);
    assert(typeof out.message === 'string' && out.message.length > 0);
  });

  await test('bounded wrapper surfaces auth failure as fallback', async () => {
    // Auth resolves but not ok → summarizeReadiness path, still fallbackRequired.
    const out = await getInteractiveBrokersReadinessBounded({
      portfolio: 'etf',
      buildClient: makeStubClient(),
      authenticate: async () => ({ ok: false, error: 'native_error' }),
      posture: async () => ({ posture: 'live_or_realtime', detail: 'x' }),
      authTimeoutMs: 25,
      postureTimeoutMs: 25,
    });
    assert.strictEqual(out.fallbackRequired, true);
    assert(typeof out.message === 'string' && out.message.length > 0);
  });

  console.log(JSON.stringify({ ok: true, passed }, null, 2));
})().catch((err) => { console.error(err); process.exit(1); });
