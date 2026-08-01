'use strict';

const { extractYahooLastClose, fetchYahooLastClose, fetchExternalLastClose } = require('../quotes/externalFallback');
const { getQuoteServiceClient } = require('../quotes');

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeKey(value) {
  return String(value || '').trim().toUpperCase();
}

function mapExternalQuoteSymbol(instrument = {}) {
  const override = String(instrument.externalQuoteSymbol || '').trim().toUpperCase();
  if (override) return override;
  const primary = String(instrument.ibkrPrimaryExchange || '').trim().toUpperCase();
  const local = String(instrument.ibkrLocalSymbol || '').trim().toUpperCase();
  const symbol = String(instrument.ibkrSymbol || '').trim().toUpperCase();
  if (!symbol && !local) return null;
  if (primary === 'IBIS2') return `${symbol}.DE`;
  if (primary === 'EBS') return `${local || symbol}.SW`;
  if (primary === 'LSEETF') return `${symbol}.L`;
  const exchange = String(instrument.exchange || '').trim().toUpperCase();
  if (exchange.includes('XETRA') || exchange.includes('IBIS')) return `${symbol}.DE`;
  if (exchange.includes('SIX') || exchange.includes('SWISS')) return `${local || symbol}.SW`;
  return symbol ? `${symbol}.DE` : null;
}


async function resolveHoldingQuotes({ holdingRows = [], approvedInstruments = [], portfolio = 'etf', brokerReadiness = null, quoteClient = null } = {}) {
  // Phase C boundary: resolve quotes through the client seam so callers (and
  // tests) can swap the transport without touching provider internals.
  const client = quoteClient || getQuoteServiceClient();
  const approvedByKey = new Map();
  for (const instrument of approvedInstruments) {
    const noteText = String(instrument.notes || instrument.note || '');
    const conidMatch = noteText.match(/ibkr_conid\s*=\s*([^;\s|]+)/i);
    const primaryKeys = [
      instrument.tickerOrIsin,
      instrument.ibkrConid,
      instrument.ibkrSymbol,
      instrument.ibkrLocalSymbol,
      instrument.name,
      conidMatch ? conidMatch[1] : null,
    ].filter(Boolean);
    for (const key of primaryKeys) {
      approvedByKey.set(normalizeKey(key), instrument);
    }
  }

  const resolvedRows = [];
  for (const row of holdingRows) {
    const keyCandidates = [row.tickerOrIsin, row.symbol, row.name, row.displaySymbol, row.conid].filter(Boolean).map(normalizeKey);
    const instrument = keyCandidates.map((key) => approvedByKey.get(key)).find(Boolean) || null;
    const quantity = asNumber(row.quantity);
    const fxToChf = asNumber(row.fxToChf) ?? (String(row.currency || 'CHF').toUpperCase() === 'CHF' ? 1 : null);
    const snapshotPriceNative = asNumber(row.lastPrice);
    const snapshotValueChf = asNumber(row.valueChf);

    let resolvedPriceNative = snapshotPriceNative;
    let resolvedValueChf = snapshotValueChf;
    let quoteSource = 'holdings_snapshot';
    let quoteProviderLabel = 'Holdings snapshot';
    let quoteQuality = 'stale_or_unknown';
    let quoteAsOf = null;
    let quoteAgeSeconds = null;
    let quoteAgeLabel = 'unknown';
    let quoteAttempts = [];
    let quoteNote = 'Using holdings snapshot value because no fresher reporting-time quote was resolved.';
    let externalSymbol = instrument ? mapExternalQuoteSymbol(instrument) : null;

    const brokerAuthenticated = Boolean(brokerReadiness?.authenticated);
    const brokerMode = String(brokerReadiness?.marketDataMode || '').toLowerCase();
    const brokerSupportsSnapshotValuation = brokerAuthenticated && (brokerMode === 'live_or_realtime' || brokerMode === 'delayed');

    if (brokerSupportsSnapshotValuation) {
      quoteSource = 'holdings_snapshot';
      quoteProviderLabel = 'Holdings snapshot';
      quoteQuality = brokerMode === 'delayed' ? 'last_close' : 'live_or_realtime';
      quoteNote = brokerMode === 'delayed'
        ? 'Using broker-backed holdings snapshot while IBKR quote posture is delayed-only (common outside market hours). Prefer last market close style valuation.'
        : 'Using broker-backed holdings snapshot from the latest healthy IBKR sync.';
    }

    const shouldTryServiceQuote = Boolean(instrument);
    if (shouldTryServiceQuote) {
      const serviceQuote = await client.getQuote({
        portfolio,
        instrument,
        conid: instrument.ibkrConid || row.conid || null,
        externalSymbol,
      });
      quoteAttempts = Array.isArray(serviceQuote?.attempts) ? serviceQuote.attempts : [];
      if (serviceQuote?.ok && quantity != null && fxToChf != null) {
        const candidatePrice = asNumber(serviceQuote.price ?? serviceQuote.ask ?? serviceQuote.last ?? serviceQuote.close);
        if (candidatePrice != null) {
          resolvedPriceNative = candidatePrice;
          resolvedValueChf = Number((candidatePrice * quantity * fxToChf).toFixed(2));
          quoteSource = serviceQuote.providerPath || quoteSource;
          quoteProviderLabel = serviceQuote.providerLabel || quoteProviderLabel;
          quoteQuality = serviceQuote.quality || quoteQuality;
          quoteAsOf = serviceQuote.asOf || null;
          quoteAgeSeconds = asNumber(serviceQuote.ageSeconds);
          quoteAgeLabel = serviceQuote.ageLabel || 'unknown';
          quoteNote = serviceQuote.note || quoteNote;
        }
      } else if (!brokerSupportsSnapshotValuation && snapshotValueChf != null) {
        quoteNote = 'Using the latest holdings snapshot value because broker/service quote resolution did not produce a fresher usable valuation.';
      }
    }

    resolvedRows.push({
      ...row,
      resolvedPriceNative,
      resolvedValueChf,
      quoteSource,
      quoteProviderLabel,
      quoteQuality,
      quoteAsOf,
      quoteAgeSeconds,
      quoteAgeLabel,
      quoteAttempts,
      quoteNote,
      externalSymbol,
      quoteTrusted: brokerSupportsSnapshotValuation || quoteSource !== 'holdings_snapshot',
    });
  }

  return { rows: resolvedRows };
}

module.exports = {
  normalizeKey,
  mapExternalQuoteSymbol,
  fetchExternalLastClose,
  resolveHoldingQuotes,
  extractYahooLastClose,
  fetchYahooLastClose,
};
