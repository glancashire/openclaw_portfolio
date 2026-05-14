function normalizeContractIntelligence(raw = {}, options = {}) {
  const summary = raw?.summary || {};
  const contract = raw?.contract || {};
  const fallback = raw || {};
  const detail = raw?.details || raw;
  const conid = numberOrNull(summary.conId ?? contract.conId ?? fallback.conid ?? fallback.conidEx ?? fallback.conId);
  const symbol = stringOrNull(summary.symbol ?? contract.symbol ?? fallback.symbol ?? fallback.companyHeader ?? fallback.name);
  const localSymbol = stringOrNull(summary.localSymbol ?? contract.localSymbol ?? fallback.localSymbol ?? fallback.description);
  const primaryExch = stringOrNull(summary.primaryExch ?? contract.primaryExch ?? fallback.primaryExch);
  const exchange = stringOrNull(summary.exchange ?? contract.exchange ?? fallback.exchange ?? fallback.listingExchange ?? fallback.exchangeName);
  const currency = stringOrNull(summary.currency ?? contract.currency ?? fallback.currency);
  const secType = stringOrNull(summary.secType ?? contract.secType ?? fallback.secType ?? fallback.assetClass);
  const isin = stringOrNull(summary.isin ?? contract.isin ?? fallback.isin);
  const name = stringOrNull(detail?.longName ?? fallback.companyName ?? fallback.name ?? fallback.description ?? summary.description ?? contract.description ?? localSymbol ?? symbol);
  const description = stringOrNull(fallback.description ?? detail?.marketName ?? localSymbol);
  const venue = primaryExch || exchange || null;
  const venueKey = [secType || 'unknown', currency || 'unknown', venue || 'unknown'].join('::');

  return {
    conid,
    symbol,
    localSymbol,
    primaryExch,
    exchange,
    currency,
    secType,
    isin,
    name,
    description,
    venue,
    venueKey,
    raw,
  };
}

function rankContractMatch(candidate = {}, instrument = {}) {
  const symbol = String(candidate.symbol || '').toUpperCase();
  const localSymbol = String(candidate.localSymbol || '').toUpperCase();
  const expectedSymbol = String(instrument.ibkrSymbol || instrument.symbol || '').toUpperCase();
  const expectedCurrency = String(instrument.currency || '').toUpperCase();
  const expectedIsin = String(instrument.tickerOrIsin || instrument.isin || '').toUpperCase();
  const expectedVenue = String(instrument.exchange || instrument.ibkrExchange || '').toUpperCase();

  let score = 0;
  if (expectedSymbol && symbol === expectedSymbol) score += 100;
  if (expectedSymbol && localSymbol === expectedSymbol) score += 80;
  if (expectedCurrency && String(candidate.currency || '').toUpperCase() === expectedCurrency) score += 30;
  if (expectedIsin && String(candidate.isin || '').toUpperCase() === expectedIsin) score += 25;
  if (expectedVenue) {
    if (String(candidate.primaryExch || '').toUpperCase() === expectedVenue) score += 20;
    else if (String(candidate.exchange || '').toUpperCase() === expectedVenue) score += 10;
  }
  if (candidate.primaryExch) score += 3;
  if (candidate.localSymbol) score += 2;
  if (candidate.conid != null) score += 1;
  return score;
}

function pickBestContractIntelligence(candidates = [], instrument = {}) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  return [...candidates]
    .map((candidate) => ({ candidate, score: rankContractMatch(candidate, instrument) }))
    .sort((a, b) => b.score - a.score
      || String(a.candidate.primaryExch || '').localeCompare(String(b.candidate.primaryExch || ''))
      || String(a.candidate.exchange || '').localeCompare(String(b.candidate.exchange || ''))
      || String(a.candidate.symbol || '').localeCompare(String(b.candidate.symbol || '')))[0].candidate;
}

function stringOrNull(value) {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

module.exports = {
  normalizeContractIntelligence,
  rankContractMatch,
  pickBestContractIntelligence,
};
