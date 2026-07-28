'use strict';

const {
  asNumber,
  isoToAgeSeconds,
  formatAgeLabel,
  normalizeQuoteResult,
} = require('./quoteService');
const {
  markProviderSuccess,
  markProviderFailure,
  isProviderCoolingDown,
  getCachedQuote,
  putCachedQuote,
  snapshotProviderHealth,
} = require('./runtime');

async function resolveQuoteWithRuntime({ providers = [], context = {}, options = {} } = {}) {
  const attempts = [];
  const cached = options.disableCache ? null : getCachedQuote(context);
  if (cached) {
    return {
      ...cached,
      cacheHit: true,
      ageSeconds: cached.ageSeconds != null ? cached.ageSeconds : isoToAgeSeconds(cached.asOf),
      ageLabel: cached.ageLabel || formatAgeLabel(cached.ageSeconds),
      attempts: [{ providerPath: cached.providerPath, ok: true, reason: 'cache_hit', quality: cached.quality }],
    };
  }

  for (const provider of providers) {
    const providerId = provider.id || 'unknown';
    if (!options.forceProviders && isProviderCoolingDown(providerId)) {
      attempts.push({ providerPath: providerId, ok: false, reason: 'cooldown_active', quality: null });
      continue;
    }
    try {
      const result = await provider.fetchQuote(context);
      const normalized = normalizeQuoteResult(result, provider, context);
      attempts.push({ providerPath: normalized.providerPath, ok: normalized.ok, reason: normalized.reason || null, quality: normalized.quality || null });
      if (normalized.ok) {
        markProviderSuccess(providerId);
        if (!options.disableCache) putCachedQuote(context, normalized);
        return { ...normalized, attempts };
      }
      markProviderFailure(providerId, normalized.reason || normalized.note || 'provider_returned_unusable_quote');
    } catch (error) {
      attempts.push({ providerPath: providerId, ok: false, reason: String(error?.message || error || 'provider_error') });
      markProviderFailure(providerId, error?.message || error || 'provider_error');
    }
  }

  return {
    ok: false,
    providerPath: attempts[0]?.providerPath || 'none',
    providerLabel: attempts[0]?.providerPath || 'No provider',
    quality: 'stale_or_unknown',
    asOf: null,
    ageSeconds: null,
    ageLabel: 'unknown',
    note: 'No quote provider returned a usable quote.',
    attempts,
  };
}

async function resolveQuotesWithRuntime({ contexts = [], providers = [], options = {} } = {}) {
  const rows = [];
  for (const context of contexts) {
    rows.push(await resolveQuoteWithRuntime({ providers, context, options }));
  }
  return rows;
}

module.exports = {
  asNumber,
  isoToAgeSeconds,
  formatAgeLabel,
  normalizeQuoteResult,
  resolveQuoteWithRuntime,
  resolveQuotesWithRuntime,
  snapshotProviderHealth,
};
