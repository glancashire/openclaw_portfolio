'use strict';

const {
  summarizeReadiness,
  getGenericFallbackProbeCandidates,
  getProbeCandidates,
  detectMarketDataPosture,
} = require('../src/brokers/interactive-brokers/readiness');
const { classifySymptoms } = require('../src/execution/selfHeal');

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

  summary = summarizeReadiness({
    config: { ok: true },
    auth: { ok: false, reason: 'native_error', error: 'connect ECONNREFUSED 127.0.0.1:4001' },
    marketData: null,
  });
  assert(summary.reason === 'native_error', 'expected auth failure reason to pass through');
  assert(summary.fallbackRequired === true, 'expected auth failure to require fallback');
  assert(summary.operatorState?.code === 'ibkr_socket_dead', 'expected socket-dead operator state');
  assert(/gateway appears offline/i.test(summary.operatorState?.summary || ''), 'expected socket-dead operator summary');

  summary = summarizeReadiness({
    config: { ok: true },
    auth: { ok: false, reason: 'native_error', error: 'Login failed: awaiting login / 2FA confirmation in IB Gateway' },
    marketData: null,
  });
  assert(summary.operatorState?.code === 'ibkr_login_or_2fa_pending', 'expected 2FA/login pending operator state');
  assert(/manual login\/2fa/i.test(summary.operatorState?.summary || ''), 'expected 2FA/login pending operator summary');
  assert(/do not auto-retry/i.test(summary.guidance), 'expected 2FA guidance to avoid auto-retry');

  summary = summarizeReadiness({
    config: { ok: true },
    auth: { ok: true, reason: 'ready' },
    marketData: { posture: 'delayed_only', detail: 'Delayed market data is available via executable trade VUSA.' },
  });
  assert(summary.operatorState?.code === 'delayed_market_data_only', 'expected delayed-only operator state');
  assert(/delayed/i.test(summary.operatorState?.summary || ''), 'expected delayed-only operator summary');

  summary = summarizeReadiness({
    config: { ok: true },
    auth: { ok: true, reason: 'ready' },
    marketData: { posture: 'unknown', detail: 'No probe contract conid available.' },
  });
  assert(summary.operatorState?.code === 'broker_connected_quote_state_unclear', 'expected unknown quote posture operator state');
  assert(/quote posture is still unclear/i.test(summary.operatorState?.summary || ''), 'expected unclear quote posture summary');

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
  } else if (probeCandidates.some((row) => row.source === 'generic_control')) {
    assert(probeCandidates[0].source === 'generic_control', 'expected generic-control probes to lead ordering when no executable probes exist');
  } else if (probeCandidates.some((row) => row.source === 'approved_instrument')) {
    assert(probeCandidates[0].source === 'approved_instrument', 'expected approved-instrument probes to lead ordering when no executable or control probes exist');
  } else {
    assert(probeCandidates[0].source === 'generic_fallback', 'expected fallback probes first only when no portfolio probes exist');
  }

  const posture = await detectMarketDataPosture({
    fetchMarketSnapshot: async ([conid]) => {
      if (String(conid) === '243939970') return [{ '7295': '101.25' }];
      if (String(conid) === '75776072') return [{ '7295': '600.50' }];
      throw new Error('missing');
    },
  }, { portfolio: 'missing-portfolio' });
  assert(posture.posture === 'delayed_close_only' || posture.posture === 'delayed_only', 'expected delayed posture from fallback close');
  assert(posture.probeSource === 'generic_control' || posture.probeSource === 'generic_fallback', 'expected probe source to report generic control or fallback');

  const classified = classifySymptoms({
    brokerReadiness: summary,
    deliveryStatus: { pendingActions: [] },
    cronHealth: { jobs: [] },
    errorState: null,
  });
  assert(classified.some((item) => item.category === 'broker_connected_quote_state_unclear'), 'expected self-heal symptom classification to include unclear quote posture');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
