'use strict';

const https = require('https');

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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 OpenClaw/1.0' } }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          const err = new Error(`HTTP ${res.statusCode}`);
          err.statusCode = res.statusCode;
          err.body = body;
          reject(err);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          error.body = body;
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('timeout')));
  });
}

function extractYahooLastClose(payload = {}) {
  const result = payload?.chart?.result?.[0];
  if (!result) return null;
  const meta = result.meta || {};
  const closes = result.indicators?.quote?.[0]?.close || [];
  const timestamps = result.timestamp || [];
  let lastClose = null;
  let asOf = null;
  for (let i = closes.length - 1; i >= 0; i -= 1) {
    const close = asNumber(closes[i]);
    if (close == null) continue;
    lastClose = close;
    const ts = Number(timestamps[i]);
    asOf = Number.isFinite(ts) ? new Date(ts * 1000).toISOString() : null;
    break;
  }
  const previousClose = asNumber(meta.previousClose);
  const regularMarketPreviousClose = asNumber(meta.chartPreviousClose);
  const chosen = lastClose ?? previousClose ?? regularMarketPreviousClose;
  if (chosen == null) return null;
  return {
    close: chosen,
    asOf,
    currency: meta.currency || null,
    symbol: meta.symbol || null,
  };
}

async function fetchYahooLastClose({ externalSymbol = null } = {}) {
  if (!externalSymbol) {
    return { ok: false, reason: 'missing_symbol', message: 'No external symbol mapping available for Yahoo fallback.' };
  }
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(externalSymbol)}?range=7d&interval=1d&includePrePost=false`;
  try {
    const payload = await fetchJson(url);
    const extracted = extractYahooLastClose(payload);
    if (!extracted) {
      return { ok: false, reason: 'missing_close', message: `Yahoo response did not contain a usable last-close quote for ${externalSymbol}.` };
    }
    return {
      ok: true,
      source: 'yahoo_last_close',
      provider: 'yahoo_chart',
      close: extracted.close,
      asOf: extracted.asOf,
      note: `Resolved from Yahoo Finance chart close series for ${externalSymbol}.`,
      currency: extracted.currency,
      externalSymbol,
    };
  } catch (error) {
    const status = Number(error?.statusCode || 0);
    return {
      ok: false,
      reason: status === 429 ? 'rate_limited' : 'fetch_failed',
      message: error?.message || 'Yahoo fallback fetch failed.',
      statusCode: status || null,
      externalSymbol,
    };
  }
}

async function fetchExternalLastClose({ instrument = null, externalSymbol = null } = {}) {
  const yahoo = await fetchYahooLastClose({ externalSymbol });
  if (yahoo?.ok) {
    return {
      ...yahoo,
      instrument: instrument ? (instrument.tickerOrIsin || instrument.ibkrSymbol || null) : null,
    };
  }
  return {
    ok: false,
    reason: yahoo?.reason || 'external_fallback_unavailable',
    message: yahoo?.message || `No unattended external fallback source is currently trustworthy enough for automatic per-holding resolution in this environment${externalSymbol ? ` (${externalSymbol})` : ''}.`,
    instrument: instrument ? (instrument.tickerOrIsin || instrument.ibkrSymbol || null) : null,
    attempts: [yahoo].filter(Boolean),
  };
}

async function resolveHoldingQuotes({ holdingRows = [], approvedInstruments = [], portfolio = 'etf', brokerReadiness = null } = {}) {
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
  normalizeKey,
  mapExternalQuoteSymbol,
  fetchExternalLastClose,
  resolveHoldingQuotes,
  extractYahooLastClose,
  fetchYahooLastClose,
};
