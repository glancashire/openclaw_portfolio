const { InteractiveBrokersClient } = require('./client');
const { logBrokerEvent } = require('../shared/safeLogger');
const { normalizeContractIntelligence } = require('./contractIntelligence');

async function searchEtfInstruments({ query, portfolio = 'etf' }) {
  const client = new InteractiveBrokersClient({ portfolio });
  const auth = await client.authenticate();

  if (!auth.ok) {
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
      reason: 'native_search_error',
      error: error.message,
      auth,
      guidance: 'Use native raw contract details / ISIN search before falling back to any browser-session tooling.',
      log: logBrokerEvent({
        broker: 'interactive-brokers',
        operation: 'search_instruments',
        status: 'native_search_error',
        summary: { query, message: error.message },
        portfolio,
      }),
    };
  }
}

function normalizeSearchResults(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => normalizeContractIntelligence(item));
}

function isLikelyEtf(row) {
  const haystack = `${row.name || ''} ${row.description || ''} ${row.secType || ''}`.toLowerCase();
  return haystack.includes('etf') || haystack.includes('fund') || row.secType === 'ETF';
}

module.exports = { searchEtfInstruments, normalizeSearchResults, isLikelyEtf };
