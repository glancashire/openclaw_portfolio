const { InteractiveBrokersClient } = require('./client');
const { logBrokerEvent } = require('../shared/safeLogger');

async function searchEtfInstruments({ query, portfolio = 'etf' }) {
  const client = new InteractiveBrokersClient({ portfolio });
  const auth = await client.authenticate();
  if (!auth.ok) {
    return { ok: false, reason: 'auth_failed', auth };
  }

  try {
    const raw = await client.searchContracts(query);
    const rows = normalizeSearchResults(raw).filter((row) => isLikelyEtf(row));
    return {
      ok: true,
      query,
      count: rows.length,
      instruments: rows,
      log: logBrokerEvent({
        broker: 'interactive-brokers',
        operation: 'search_instruments',
        status: 'ok',
        summary: { query, count: rows.length },
        portfolio,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'http_error',
      error: error.message,
      log: logBrokerEvent({
        broker: 'interactive-brokers',
        operation: 'search_instruments',
        status: 'http_error',
        summary: { query, message: error.message },
        portfolio,
      }),
    };
  }
}

function normalizeSearchResults(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => ({
    conid: item.conid || item.conidEx || null,
    symbol: item.symbol || item.companyHeader || item.name || null,
    name: item.companyName || item.name || item.description || item.companyHeader || null,
    description: item.description || null,
    exchange: item.exchange || item.listingExchange || item.exchangeName || null,
    currency: item.currency || null,
    isin: item.isin || null,
    secType: item.secType || item.assetClass || null,
    raw: item,
  }));
}

function isLikelyEtf(row) {
  const haystack = `${row.name || ''} ${row.description || ''} ${row.secType || ''}`.toLowerCase();
  return haystack.includes('etf') || haystack.includes('fund') || row.secType === 'ETF';
}

module.exports = { searchEtfInstruments, normalizeSearchResults, isLikelyEtf };
