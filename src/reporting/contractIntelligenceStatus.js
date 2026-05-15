const { normalizeContractIntelligence } = require('../brokers/interactive-brokers/contractIntelligence');

function summarizeContractIntelligence(instruments = []) {
  const rows = Array.isArray(instruments) ? instruments : [];
  const items = rows.map((instrument) => classifyInstrument(instrument));
  const missingConid = items.filter((item) => item.missingConid);
  const missingSymbol = items.filter((item) => item.missingSymbol);
  const missingVenue = items.filter((item) => item.missingVenue);
  const complete = items.filter((item) => item.ready);

  return {
    total: items.length,
    readyCount: complete.length,
    missingConidCount: missingConid.length,
    missingSymbolCount: missingSymbol.length,
    missingVenueCount: missingVenue.length,
    items,
    examples: {
      missingConid: missingConid.slice(0, 3).map(toExample),
      missingSymbol: missingSymbol.slice(0, 3).map(toExample),
      missingVenue: missingVenue.slice(0, 3).map(toExample),
      ready: complete.slice(0, 3).map(toExample),
    },
    summaryLine: formatSummaryLine({
      total: items.length,
      readyCount: complete.length,
      missingConidCount: missingConid.length,
      missingSymbolCount: missingSymbol.length,
      missingVenueCount: missingVenue.length,
    }),
    nextAction: buildNextAction({ missingConid, missingSymbol, missingVenue }),
  };
}

function classifyInstrument(instrument = {}) {
  const normalized = normalizeContractIntelligence({
    contract: {
      conId: instrument.ibkrConid,
      symbol: instrument.ibkrSymbol,
      primaryExch: instrument.exchange,
      exchange: instrument.exchange,
      currency: instrument.currency,
    },
    isin: instrument.tickerOrIsin,
    description: instrument.name,
    localSymbol: instrument.metadata?.ibkr_local_symbol || instrument.metadata?.local_symbol,
  });

  const missingConid = normalized.conid == null;
  const missingSymbol = !normalized.symbol;
  const missingVenue = !(normalized.primaryExch || normalized.exchange || instrument.exchange);
  const ready = !missingConid && !missingSymbol && !missingVenue;

  return {
    tickerOrIsin: instrument.tickerOrIsin || '',
    name: instrument.name || '',
    currency: instrument.currency || '',
    exchange: instrument.exchange || '',
    ready,
    missingConid,
    missingSymbol,
    missingVenue,
    identity: {
      conid: normalized.conid,
      symbol: normalized.symbol,
      localSymbol: normalized.localSymbol,
      venue: normalized.venue,
      venueKey: normalized.venueKey,
      isin: normalized.isin,
    },
  };
}

function toExample(item = {}) {
  return {
    tickerOrIsin: item.tickerOrIsin,
    symbol: item.identity?.symbol || 'missing_symbol',
    venue: item.identity?.venue || 'missing_venue',
    conid: item.identity?.conid,
    venueKey: item.identity?.venueKey || 'unknown',
  };
}

function formatSummaryLine(summary = {}) {
  return `${summary.readyCount || 0}/${summary.total || 0} approved instrument(s) have complete IBKR contract identity; missing conid: ${summary.missingConidCount || 0}, missing symbol: ${summary.missingSymbolCount || 0}, missing venue: ${summary.missingVenueCount || 0}.`;
}

function buildNextAction({ missingConid = [], missingSymbol = [], missingVenue = [] } = {}) {
  if (missingConid.length > 0) return 'Resolve missing IBKR conids before treating the full approved instrument list as execution-ready.';
  if (missingSymbol.length > 0) return 'Fill missing IBKR symbols so contract resolution is deterministic and auditable.';
  if (missingVenue.length > 0) return 'Fill missing exchange / venue identity so operators can verify the intended execution venue.';
  return 'No contract-intelligence remediation is currently required.';
}

module.exports = {
  summarizeContractIntelligence,
  classifyInstrument,
  formatSummaryLine,
  buildNextAction,
};
