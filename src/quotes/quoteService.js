'use strict';

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isoToAgeSeconds(asOf, { now = Date.now() } = {}) {
  if (!asOf) return null;
  const ts = Date.parse(asOf);
  if (!Number.isFinite(ts)) return null;
  const age = Math.max(0, Math.floor((now - ts) / 1000));
  return Number.isFinite(age) ? age : null;
}

function formatAgeLabel(ageSeconds) {
  const age = asNumber(ageSeconds);
  if (age == null) return 'unknown';
  if (age < 60) return `${age}s`;
  if (age < 3600) return `${Math.floor(age / 60)}m`;
  if (age < 86400) return `${Math.floor(age / 3600)}h`;
  return `${Math.floor(age / 86400)}d`;
}

function normalizeQuoteResult(result = {}, provider = {}, context = {}) {
  const asOf = result.asOf || null;
  const ageSeconds = result.ageSeconds != null ? asNumber(result.ageSeconds) : isoToAgeSeconds(asOf);
  return {
    ok: Boolean(result.ok),
    price: asNumber(result.price),
    bid: asNumber(result.bid),
    ask: asNumber(result.ask),
    last: asNumber(result.last),
    close: asNumber(result.close),
    currency: result.currency || null,
    providerPath: result.providerPath || provider.id || 'unknown',
    providerLabel: result.providerLabel || provider.label || provider.id || 'Unknown provider',
    quality: result.quality || 'stale_or_unknown',
    asOf,
    ageSeconds,
    ageLabel: formatAgeLabel(ageSeconds),
    note: result.note || null,
    reason: result.reason || null,
    externalSymbol: result.externalSymbol || context.externalSymbol || null,
    attempts: Array.isArray(result.attempts) ? result.attempts : [],
    raw: result.raw || null,
  };
}

async function resolveQuote({ providers = [], context = {} } = {}) {
  const attempts = [];
  for (const provider of providers) {
    try {
      const result = await provider.fetchQuote(context);
      const normalized = normalizeQuoteResult(result, provider, context);
      attempts.push({ providerPath: normalized.providerPath, ok: normalized.ok, reason: normalized.reason || null, quality: normalized.quality || null });
      if (normalized.ok) {
        return { ...normalized, attempts };
      }
    } catch (error) {
      attempts.push({ providerPath: provider.id || 'unknown', ok: false, reason: String(error?.message || error || 'provider_error') });
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

async function resolveQuotes({ contexts = [], providers = [] } = {}) {
  const rows = [];
  for (const context of contexts) {
    rows.push(await resolveQuote({ providers, context }));
  }
  return rows;
}

module.exports = {
  asNumber,
  isoToAgeSeconds,
  formatAgeLabel,
  normalizeQuoteResult,
  resolveQuote,
  resolveQuotes,
};
