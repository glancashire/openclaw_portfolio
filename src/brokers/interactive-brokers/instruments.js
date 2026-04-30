const { InteractiveBrokersClient } = require('./client');
const { InteractiveBrokersBrowserSessionClient } = require('./browserSessionClient');
const { logBrokerEvent } = require('../shared/safeLogger');

async function searchEtfInstruments({ query, portfolio = 'etf', appCode = null, preferBrowserSession = false }) {
  const client = new InteractiveBrokersClient({ portfolio });
  const auth = await client.authenticate();

  if (!auth.ok && !preferBrowserSession) {
    return {
      ok: false,
      query,
      reason: 'auth_failed',
      error: auth.error || 'Interactive Brokers authentication failed',
      auth,
      log: logBrokerEvent({
        broker: 'interactive-brokers',
        operation: 'search_instruments',
        status: 'auth_failed',
        summary: { query, message: auth.error || auth.reason || 'authentication failed' },
        portfolio,
      }),
    };
  }

  try {
    const raw = preferBrowserSession
      ? await searchViaBrowserSession({ query, portfolio, appCode, auth })
      : await client.searchContracts(query);
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
      reason: preferBrowserSession ? 'browser_session_error' : 'http_error',
      error: error.message,
      auth,
      log: logBrokerEvent({
        broker: 'interactive-brokers',
        operation: 'search_instruments',
        status: preferBrowserSession ? 'browser_session_error' : 'http_error',
        summary: { query, message: error.message },
        portfolio,
      }),
    };
  }
}

async function searchViaBrowserSession({ query, portfolio, appCode, auth }) {
  if (!appCode) {
    throw new Error('Interactive Brokers browser-session search requires appCode');
  }
  const browserClient = new InteractiveBrokersBrowserSessionClient({ portfolio });
  const response = await browserClient.searchContracts(query, appCode);
  if (!response.ok) {
    throw new Error(`IBKR browser-session search failed (${response.status}): ${response.text}`);
  }
  return response.json;
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
