const path = require('path');
const { readApprovedInstruments } = require('../analysis/approvedInstruments');
const { InteractiveBrokersClient } = require('../brokers/interactive-brokers/client');
const {
  normalizeInstrumentCalendarRow,
  buildMarketCalendarArtifact,
  writeMarketCalendarArtifact,
} = require('./marketCalendarStore');

/**
 * Determines whether an instrument has enough IBKR identity to attempt a contract-details lookup.
 */
function hasIbkrIdentity(instrument = {}) {
  return Boolean(instrument.ibkrConid || instrument.ibkrSymbol || instrument.ibkrLocalSymbol || instrument.ibkrPrimaryExchange);
}

/**
 * Normalize a single instrument's contract-details response into a calendar row.
 */
function normalizeContractCalendarRow(instrument = {}, contractDetails = null, now = new Date()) {
  if (!hasIbkrIdentity(instrument)) {
    return normalizeInstrumentCalendarRow({
      tickerOrIsin: instrument.tickerOrIsin,
      name: instrument.name,
      exchange: instrument.exchange,
      currency: instrument.currency,
      syncStatus: 'missing_identity',
      sourceKind: 'approved_instrument',
      error: null,
    }, now);
  }

  if (!contractDetails) {
    return normalizeInstrumentCalendarRow({
      tickerOrIsin: instrument.tickerOrIsin,
      name: instrument.name,
      ibkrConid: instrument.ibkrConid,
      ibkrSymbol: instrument.ibkrSymbol,
      ibkrLocalSymbol: instrument.ibkrLocalSymbol,
      ibkrPrimaryExchange: instrument.ibkrPrimaryExchange,
      exchange: instrument.exchange,
      currency: instrument.currency,
      syncStatus: 'ibkr_unavailable',
      sourceKind: 'ibkr_contract',
      error: 'contract_details_unavailable',
    }, now);
  }

  return normalizeInstrumentCalendarRow({
    tickerOrIsin: instrument.tickerOrIsin,
    name: instrument.name,
    ibkrConid: contractDetails.conid || instrument.ibkrConid,
    ibkrSymbol: contractDetails.symbol || instrument.ibkrSymbol,
    ibkrLocalSymbol: contractDetails.localSymbol || instrument.ibkrLocalSymbol,
    ibkrPrimaryExchange: contractDetails.primaryExchange || contractDetails.primaryExch || instrument.ibkrPrimaryExchange,
    exchange: contractDetails.exchange || instrument.exchange,
    currency: contractDetails.currency || instrument.currency,
    tradingHoursRaw: contractDetails.tradingHours || '',
    liquidHoursRaw: contractDetails.liquidHours || '',
    syncStatus: 'ok',
    sourceKind: 'ibkr_contract',
    lastSyncedAt: now.toISOString(),
    error: null,
  }, now);
}

/**
 * Sync market calendar data for all approved instruments in a portfolio.
 * Degrades gracefully when broker is unavailable or instruments lack identity.
 */
async function syncMarketCalendar({ portfolioDir, brokerClient = null, now = new Date(), runtimeRoot } = {}) {
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const approvedInstruments = readApprovedInstruments(portfolioPath);
  const client = brokerClient || new InteractiveBrokersClient({ portfolio: path.basename(portfolioDir) });
  const rows = [];
  let brokerReady = true;

  for (const instrument of approvedInstruments) {
    if (!hasIbkrIdentity(instrument)) {
      rows.push(normalizeContractCalendarRow(instrument, null, now));
      continue;
    }
    try {
      const details = await client.fetchContractDetailsByConid(instrument.ibkrConid);
      rows.push(normalizeContractCalendarRow(instrument, details, now));
    } catch (error) {
      brokerReady = false;
      rows.push(normalizeInstrumentCalendarRow({
        tickerOrIsin: instrument.tickerOrIsin,
        name: instrument.name,
        ibkrConid: instrument.ibkrConid,
        ibkrSymbol: instrument.ibkrSymbol,
        ibkrLocalSymbol: instrument.ibkrLocalSymbol,
        ibkrPrimaryExchange: instrument.ibkrPrimaryExchange,
        exchange: instrument.exchange,
        currency: instrument.currency,
        syncStatus: 'ibkr_error',
        sourceKind: 'ibkr_contract',
        error: error.message || 'unknown_error',
      }, now));
    }
  }

  const artifact = buildMarketCalendarArtifact({
    portfolioDir,
    generatedAt: now.toISOString(),
    brokerReady,
    instruments: rows,
    now,
    preNormalized: true,
  });
  const artifactPath = writeMarketCalendarArtifact({ portfolioDir, runtimeRoot, artifact });
  return {
    ok: true,
    portfolio: artifact.portfolio,
    brokerReady: artifact.brokerReady,
    artifactPath,
    coverage: artifact.coverage,
    instruments: artifact.instruments,
  };
}

module.exports = {
  hasIbkrIdentity,
  normalizeContractCalendarRow,
  syncMarketCalendar,
};
