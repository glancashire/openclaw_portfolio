'use strict';

const providerState = new Map();
const quoteCache = new Map();

function nowMs() {
  return Date.now();
}

function getProviderState(providerId) {
  if (!providerState.has(providerId)) {
    providerState.set(providerId, {
      providerId,
      lastSuccessAt: null,
      lastFailureAt: null,
      consecutiveFailures: 0,
      lastError: null,
      cooldownUntil: null,
    });
  }
  return providerState.get(providerId);
}

function markProviderSuccess(providerId) {
  const state = getProviderState(providerId);
  state.lastSuccessAt = new Date().toISOString();
  state.consecutiveFailures = 0;
  state.lastError = null;
  state.cooldownUntil = null;
  return state;
}

function markProviderFailure(providerId, error, { cooldownMs = 60_000, failureThreshold = 2 } = {}) {
  const state = getProviderState(providerId);
  state.lastFailureAt = new Date().toISOString();
  state.consecutiveFailures += 1;
  state.lastError = String(error || 'provider_failure');
  if (state.consecutiveFailures >= failureThreshold) {
    state.cooldownUntil = new Date(nowMs() + cooldownMs).toISOString();
  }
  return state;
}

function isProviderCoolingDown(providerId, { now = nowMs() } = {}) {
  const state = getProviderState(providerId);
  if (!state.cooldownUntil) return false;
  const until = Date.parse(state.cooldownUntil);
  return Number.isFinite(until) && until > now;
}

function cacheKey(context = {}) {
  return JSON.stringify({
    conid: context.conid || null,
    externalSymbol: context.externalSymbol || null,
    symbol: context.instrument?.ibkrSymbol || context.instrument?.tickerOrIsin || null,
    portfolio: context.portfolio || null,
  });
}

function getCachedQuote(context = {}, { now = nowMs() } = {}) {
  const key = cacheKey(context);
  const cached = quoteCache.get(key);
  if (!cached) return null;
  if (cached.expiresAtMs <= now) {
    quoteCache.delete(key);
    return null;
  }
  return cached.value;
}

function putCachedQuote(context = {}, quote = {}) {
  const key = cacheKey(context);
  const ttlMs = quote.quality === 'live_or_realtime' ? 15_000 : quote.quality === 'last_close' ? 600_000 : 30_000;
  quoteCache.set(key, {
    value: { ...quote, cacheHit: false },
    expiresAtMs: nowMs() + ttlMs,
  });
}

function snapshotProviderHealth() {
  return Array.from(providerState.values()).map((state) => ({ ...state }));
}

function resetQuoteServiceRuntime() {
  providerState.clear();
  quoteCache.clear();
}

module.exports = {
  getProviderState,
  markProviderSuccess,
  markProviderFailure,
  isProviderCoolingDown,
  getCachedQuote,
  putCachedQuote,
  snapshotProviderHealth,
  resetQuoteServiceRuntime,
};
