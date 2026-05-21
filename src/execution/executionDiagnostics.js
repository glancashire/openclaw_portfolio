const fs = require('fs');
const path = require('path');
const { readApprovedInstruments } = require('../analysis/approvedInstruments');
const { listExecutableTradeRows } = require('./tradeState');
const { prepareOrderForSubmission } = require('./orderPreparation');

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateKey(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

function formatTimeKey(date) {
  return `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
}

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

function parseHoursSegments(raw = '') {
  return String(raw || '')
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const [date, hours] = segment.split(':');
      if (!date || !hours || hours.toUpperCase() === 'CLOSED') {
        return { date: date || null, closed: true, raw: segment };
      }
      const [start, end] = hours.split('-');
      return {
        date,
        start: start || null,
        end: end || null,
        closed: false,
        raw: segment,
      };
    });
}

function evaluateHoursState(segments = [], now = new Date()) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return { status: 'unknown', activeDay: null, activeSegment: null, nextSegment: null };
  }

  const dateKey = formatDateKey(now);
  const timeKey = formatTimeKey(now);
  const sameDay = segments.filter((segment) => segment.date === dateKey);
  const dayEntry = sameDay[0] || null;

  if (!dayEntry) {
    const nextSegment = segments.find((segment) => !segment.closed && segment.date >= dateKey) || null;
    return { status: 'unknown', activeDay: null, activeSegment: null, nextSegment };
  }

  if (dayEntry.closed) {
    return { status: 'closed', activeDay: dayEntry, activeSegment: null, nextSegment: null };
  }

  const openSegment = sameDay.find((segment) => !segment.closed && segment.start && segment.end) || null;
  if (!openSegment) {
    return { status: 'unknown', activeDay: dayEntry, activeSegment: null, nextSegment: null };
  }

  if (timeKey < openSegment.start) {
    return { status: 'before_open', activeDay: dayEntry, activeSegment: null, nextSegment: openSegment };
  }
  if (timeKey > openSegment.end) {
    return { status: 'after_close', activeDay: dayEntry, activeSegment: openSegment, nextSegment: null };
  }
  return { status: 'open', activeDay: dayEntry, activeSegment: openSegment, nextSegment: null };
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
        trading: evaluateHoursState(parseHoursSegments(contract.tradingHours || ''), now),
        liquid: evaluateHoursState(parseHoursSegments(contract.liquidHours || ''), now),
      } : {
        trading: { status: 'unknown', activeDay: null, activeSegment: null, nextSegment: null },
        liquid: { status: 'unknown', activeDay: null, activeSegment: null, nextSegment: null },
      },
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
