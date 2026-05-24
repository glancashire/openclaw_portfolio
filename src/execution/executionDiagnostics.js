const fs = require('fs');
const path = require('path');
const { readApprovedInstruments } = require('../analysis/approvedInstruments');
const { listExecutableTradeRows } = require('./tradeState');
const { prepareOrderForSubmission } = require('./orderPreparation');
const { getVenueHoursReference, evaluateVenueReferenceState } = require('./venueHoursReference');
const { parseHoursSegments, evaluateHoursState } = require('./marketCalendar');

function findApprovedInstrument(instruments, row = {}) {
  const ticker = String(row.tickerOrIsin || row['Ticker / ISIN'] || '').trim().toUpperCase();
  return instruments.find((instrument) => {
    const isin = String(instrument.tickerOrIsin || '').trim().toUpperCase();
    const symbol = String(instrument.ibkrSymbol || '').trim().toUpperCase();
    return ticker && (ticker === isin || ticker === symbol);
  }) || null;
}

function executableRowToDraftOrder(row = {}, instrument = null) {
  return {
    action: String(row.action || row.Action || '').trim().toUpperCase(),
    quantity: Number(row.quantity || row.Quantity || 0),
    limitPrice: Number(row.limitPrice || row['Limit price'] || 0),
    symbol: instrument?.ibkrSymbol || row.tickerOrIsin || row['Ticker / ISIN'] || null,
    conid: instrument?.ibkrConid || null,
    currency: instrument?.currency || 'CHF',
    exchange: 'SMART',
    transmit: true,
  };
}

function buildExecutableOrderDiagnostics({ portfolioDir, contractDetailsByTicker = {}, now = new Date() } = {}) {
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const instruments = readApprovedInstruments(portfolioPath);
  const rows = listExecutableTradeRows(tradesPath);
  return rows.map((row) => {
    const instrument = findApprovedInstrument(instruments, row);
    const preparedOrder = prepareOrderForSubmission(executableRowToDraftOrder(row, instrument), instrument);
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

module.exports = {
  findApprovedInstrument,
  executableRowToDraftOrder,
  parseHoursSegments,
  evaluateHoursState,
  buildExecutableOrderDiagnostics,
};
