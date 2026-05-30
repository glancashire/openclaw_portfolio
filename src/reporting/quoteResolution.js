'use strict';

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapExternalQuoteSymbol(instrument = {}) {
  const primary = String(instrument.ibkrPrimaryExchange || '').trim().toUpperCase();
  const local = String(instrument.ibkrLocalSymbol || '').trim().toUpperCase();
  const symbol = String(instrument.ibkrSymbol || '').trim().toUpperCase();
  if (!symbol && !local) return null;
  if (primary === 'IBIS2') return `${symbol}.DE`;
  if (primary === 'EBS') return `${local || symbol}.SW`;
  if (primary === 'LSEETF') return `${symbol}.L`;
  return null;
}

async function fetchExternalLastClose({ instrument = null, externalSymbol = null } = {}) {
  return {
    ok: false,
    reason: 'external_fallback_unavailable',
    message: `No unattended external fallback source is currently trustworthy enough for automatic per-holding resolution in this environment${externalSymbol ? ` (${externalSymbol})` : ''}.`,
    instrument: instrument ? (instrument.tickerOrIsin || instrument.ibkrSymbol || null) : null,
  };
}

async function resolveHoldingQuotes({ holdingRows = [], approvedInstruments = [], portfolio = 'etf', brokerReadiness = null } = {}) {
  const approvedByKey = new Map();
  for (const instrument of approvedInstruments) {
    for (const key of [instrument.tickerOrIsin, instrument.ibkrConid, instrument.ibkrSymbol, instrument.ibkrLocalSymbol].filter(Boolean)) {
      approvedByKey.set(String(key).trim().toUpperCase(), instrument);
    }
  }

  const resolvedRows = [];
  for (const row of holdingRows) {
    const keyCandidates = [row.tickerOrIsin, row.symbol, row.name].filter(Boolean).map((v) => String(v).trim().toUpperCase());
    const instrument = keyCandidates.map((key) => approvedByKey.get(key)).find(Boolean) || null;
    const quantity = asNumber(row.quantity);
    const fxToChf = asNumber(row.fxToChf) ?? (String(row.currency || 'CHF').toUpperCase() === 'CHF' ? 1 : null);
    const snapshotPriceNative = asNumber(row.lastPrice);
    const snapshotValueChf = asNumber(row.valueChf);

    let resolvedPriceNative = snapshotPriceNative;
    let resolvedValueChf = snapshotValueChf;
    let quoteSource = 'holdings_snapshot';
    let quoteQuality = 'stale_or_unknown';
    let quoteAsOf = null;
    let quoteNote = 'Using holdings snapshot value because no fresher reporting-time quote was resolved.';
    let externalSymbol = instrument ? mapExternalQuoteSymbol(instrument) : null;

    const brokerAuthenticated = Boolean(brokerReadiness?.authenticated);
    const brokerMode = String(brokerReadiness?.marketDataMode || '').toLowerCase();
    const brokerSupportsSnapshotValuation = brokerAuthenticated && (brokerMode === 'live_or_realtime' || brokerMode === 'delayed');

    if (brokerSupportsSnapshotValuation) {
      quoteSource = 'holdings_snapshot';
      quoteQuality = brokerMode === 'delayed' ? 'last_close' : 'live_or_realtime';
      quoteNote = brokerMode === 'delayed'
        ? 'Using broker-backed holdings snapshot while IBKR quote posture is delayed-only (common outside market hours). Prefer last market close style valuation.'
        : 'Using broker-backed holdings snapshot from the latest healthy IBKR sync.';
    }

    const shouldTryExternalFallback = Boolean(instrument) && !brokerSupportsSnapshotValuation;
    if (shouldTryExternalFallback) {
      const external = await fetchExternalLastClose({ instrument, externalSymbol });
      if (external?.ok && asNumber(external.close) != null && quantity != null && fxToChf != null) {
        resolvedPriceNative = asNumber(external.close);
        resolvedValueChf = Number((resolvedPriceNative * quantity * fxToChf).toFixed(2));
        quoteSource = external.source || 'external_last_close';
        quoteQuality = 'last_close';
        quoteAsOf = external.asOf || null;
        quoteNote = external.note || 'Resolved from an external delayed/last-close source.';
      } else if (external?.reason) {
        quoteNote = `${quoteNote} External fallback unavailable: ${external.reason}.`;
      }
    }

    resolvedRows.push({
      ...row,
      resolvedPriceNative,
      resolvedValueChf,
      quoteSource,
      quoteQuality,
      quoteAsOf,
      quoteNote,
      externalSymbol,
      quoteTrusted: brokerSupportsSnapshotValuation || quoteSource !== 'holdings_snapshot',
    });
  }

  return { rows: resolvedRows };
}

module.exports = {
  mapExternalQuoteSymbol,
  fetchExternalLastClose,
  resolveHoldingQuotes,
};
