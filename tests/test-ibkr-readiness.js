'use strict';

const { summarizeReadiness, getGenericFallbackProbeCandidates } = require('../src/brokers/interactive-brokers/readiness');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  let summary = summarizeReadiness({
    config: { ok: true },
    auth: { ok: true, reason: 'ready' },
    marketData: { posture: 'live_or_realtime', detail: 'live' },
  });
  assert(summary.reason === 'ready', 'expected live/realtime readiness to be ready');
  assert(summary.fallbackRequired === false, 'expected live/realtime readiness not to require fallback');
  assert(summary.marketDataMode === 'live_or_realtime', 'expected live/realtime marketDataMode');

  summary = summarizeReadiness({
    config: { ok: true },
    auth: { ok: true, reason: 'ready' },
    marketData: { posture: 'delayed_only', detail: 'delayed only' },
  });
  assert(summary.reason === 'delayed_data_only', 'expected delayed-only readiness reason');
  assert(summary.fallbackRequired === true, 'expected delayed-only readiness to require fallback');
  assert(summary.marketDataMode === 'delayed', 'expected delayed marketDataMode');
  assert(/delayed-only/i.test(summary.message), 'expected delayed-only readiness message');

  summary = summarizeReadiness({
    config: { ok: true },
    auth: { ok: true, reason: 'ready' },
    marketData: { posture: 'unknown', detail: 'probe produced no usable quote posture' },
  });
  assert(summary.reason === 'unknown', 'expected auth-ok unknown posture to pass through');
  assert(summary.fallbackRequired === true, 'expected auth-ok unknown posture to still require fallback');
  assert(summary.marketDataMode === 'unknown', 'expected auth-ok unknown posture marketDataMode');
  assert(/not yet yielding a usable live\/delayed quote posture/i.test(summary.message), 'expected auth-ok unknown posture message');

  const fallbackCandidates = getGenericFallbackProbeCandidates();
  assert(Array.isArray(fallbackCandidates) && fallbackCandidates.length >= 2, 'expected generic fallback probe candidates');
  assert(fallbackCandidates.some((row) => row.symbol === 'EMUAA'), 'expected EMUAA fallback candidate');
  assert(fallbackCandidates.some((row) => row.symbol === 'UBSSLI'), 'expected UBSSLI fallback candidate');

  summary = summarizeReadiness({
    config: { ok: true },
    auth: { ok: false, reason: 'native_error' },
    marketData: null,
  });
  assert(summary.reason === 'native_error', 'expected auth failure reason to pass through');
  assert(summary.fallbackRequired === true, 'expected auth failure to require fallback');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
