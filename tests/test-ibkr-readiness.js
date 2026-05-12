'use strict';

const { summarizeReadiness, getGenericFallbackProbeCandidates, getProbeCandidates, detectMarketDataPosture } = require('../src/brokers/interactive-brokers/readiness');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
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

  const probeCandidates = getProbeCandidates({ portfolio: 'etf' });
  assert(probeCandidates.length >= 2, 'expected at least two probe candidates');
  const uniqueConids = new Set(probeCandidates.map((row) => row.conid));
  assert(uniqueConids.size === probeCandidates.length, 'expected probe candidates to be deduped by conid');
  if (probeCandidates.some((row) => row.source === 'executable_trade')) {
    assert(probeCandidates[0].source === 'executable_trade', 'expected executable-trade probes to lead ordering when present');
  } else if (probeCandidates.some((row) => row.source === 'approved_instrument')) {
    assert(probeCandidates[0].source === 'approved_instrument', 'expected approved-instrument probes to lead ordering when no executable probes exist');
  } else {
    assert(probeCandidates[0].source === 'generic_fallback', 'expected fallback probes first only when no portfolio probes exist');
  }

  const posture = await detectMarketDataPosture({
    fetchMarketSnapshot: async ([conid]) => {
      if (String(conid) === '243939970') return [{ '7295': '101.25' }];
      throw new Error('missing');
    },
  }, { portfolio: 'missing-portfolio' });
  assert(posture.posture === 'delayed_only', 'expected delayed-only posture from fallback close');
  assert(posture.probeSource === 'generic_fallback', 'expected probe source to report generic fallback');

  summary = summarizeReadiness({
    config: { ok: true },
    auth: { ok: false, reason: 'native_error' },
    marketData: null,
  });
  assert(summary.reason === 'native_error', 'expected auth failure reason to pass through');
  assert(summary.fallbackRequired === true, 'expected auth failure to require fallback');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
