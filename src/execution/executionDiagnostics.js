const fs = require('fs');
const path = require('path');
const { readApprovedInstruments } = require('../analysis/approvedInstruments');
const { readMarketCalendarArtifact } = require('./marketCalendarStore');
const { listExecutableTradeRows } = require('./tradeState');
const { findApprovedInstrumentForTradeRow, prepareExecutableRowOrder } = require('./orderPreparation');
const { getVenueHoursReference, evaluateVenueReferenceState } = require('./venueHoursReference');
const { parseHoursSegments, evaluateHoursState } = require('./marketCalendar');

function buildExecutableOrderDiagnostics({ portfolioDir, contractDetailsByTicker = {}, now = new Date() } = {}) {
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const instruments = readApprovedInstruments(portfolioPath);
  const rows = listExecutableTradeRows(tradesPath);
  return rows.map((row) => {
    const { instrument, preparedOrder } = prepareExecutableRowOrder(row, instruments);
    const ticker = String(row.tickerOrIsin || '').trim().toUpperCase();
    const contract = contractDetailsByTicker[ticker] || null;
    const venue = preparedOrder.primaryExchange || instrument?.ibkrPrimaryExchange || 'EBS';
    const venueReference = getVenueHoursReference(venue);
    const fallbackTrading = evaluateVenueReferenceState(venueReference, now);
    const fallbackLiquid = evaluateVenueReferenceState(venueReference, now);

    return {
      dateTime: row.dateTime,
      tickerOrIsin: row.tickerOrIsin,
      name: row.name,
      action: row.action,
      quantity: row.quantity,
      limitPrice: row.limitPrice,
      approvedInstrument: instrument ? {
        tickerOrIsin: instrument.tickerOrIsin,
        ibkrSymbol: instrument.ibkrSymbol,
        ibkrLocalSymbol: instrument.ibkrLocalSymbol,
        ibkrConid: instrument.ibkrConid,
        ibkrPrimaryExchange: instrument.ibkrPrimaryExchange,
        exchange: instrument.exchange,
        currency: instrument.currency,
      } : null,
      preparedOrder,
      contractDetails: contract ? {
        symbol: contract.symbol || null,
        localSymbol: contract.localSymbol || null,
        exchange: contract.exchange || null,
        primaryExchange: contract.primaryExchange || contract.primaryExch || null,
        currency: contract.currency || null,
        tradingHours: contract.tradingHours || null,
        liquidHours: contract.liquidHours || null,
        tradingHoursSegments: parseHoursSegments(contract.tradingHours || ''),
        liquidHoursSegments: parseHoursSegments(contract.liquidHours || ''),
      } : null,
      hours: contract ? {
        trading: { ...evaluateHoursState(parseHoursSegments(contract.tradingHours || ''), now), sourceKind: 'ibkr_contract' },
        liquid: { ...evaluateHoursState(parseHoursSegments(contract.liquidHours || ''), now), sourceKind: 'ibkr_contract' },
      } : {
        trading: { ...fallbackTrading, sourceKind: fallbackTrading.sourceKind || 'reference' },
        liquid: { ...fallbackLiquid, sourceKind: fallbackLiquid.sourceKind || 'reference' },
      },
      venueReference,
    };
  });
}

function getCalendarCoverageSummary({ portfolioDir, now = new Date() } = {}) {
  try {
    const repoRoot = path.dirname(path.dirname(portfolioDir));
    const runtimeRoot = path.join(repoRoot, 'runtime');
    const artifact = readMarketCalendarArtifact({ portfolioDir, runtimeRoot });
    if (!artifact) {
      return { available: false, reason: 'no_artifact', generatedAt: null, coverage: null };
    }
    const ageMs = now.getTime() - new Date(artifact.generatedAt).getTime();
    const stale = ageMs > 7 * 24 * 60 * 60 * 1000;
    return {
      available: !stale,
      reason: stale ? 'stale' : 'ok',
      generatedAt: artifact.generatedAt,
      ageHours: Math.round(ageMs / (60 * 60 * 1000)),
      brokerReady: artifact.brokerReady,
      coverage: artifact.coverage || null,
    };
  } catch {
    return { available: false, reason: 'error', generatedAt: null, coverage: null };
  }
}

module.exports = {
  findApprovedInstrument: findApprovedInstrumentForTradeRow,
  parseHoursSegments,
  evaluateHoursState,
  buildExecutableOrderDiagnostics,
  getCalendarCoverageSummary,
};
