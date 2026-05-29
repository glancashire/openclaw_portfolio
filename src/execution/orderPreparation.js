const { applyExecutionTimingPolicy } = require('./orderTimingPolicy');

function normalizedUpper(value) {
  return String(value || '').trim().toUpperCase();
}

function findApprovedInstrumentForTradeRow(instruments = [], row = {}) {
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

function prepareExecutableRowOrder(row = {}, instruments = [], options = {}) {
  const instrument = options.instrument || findApprovedInstrumentForTradeRow(instruments, row);
  const preparedOrder = prepareOrderForSubmission(executableRowToDraftOrder(row, instrument), instrument, options);
  return { instrument, preparedOrder };
}

function prepareOrderForSubmission(order = {}, instrument = null, options = {}) {
  const prepared = { ...order };
  if (instrument) {
    if (!prepared.conid && instrument.ibkrConid) prepared.conid = instrument.ibkrConid;
    if (!prepared.symbol && instrument.ibkrSymbol) prepared.symbol = instrument.ibkrSymbol;
    if (!prepared.localSymbol && instrument.ibkrLocalSymbol) prepared.localSymbol = instrument.ibkrLocalSymbol;
    if (!prepared.primaryExchange && instrument.ibkrPrimaryExchange) prepared.primaryExchange = instrument.ibkrPrimaryExchange;
    if (!prepared.exchange) prepared.exchange = 'SMART';
    if (!prepared.currency && instrument.currency) prepared.currency = instrument.currency;
  }
  if (!prepared.exchange) prepared.exchange = 'SMART';
  if (prepared.symbol) prepared.symbol = normalizedUpper(prepared.symbol);
  if (prepared.primaryExchange) prepared.primaryExchange = normalizedUpper(prepared.primaryExchange);
  return applyExecutionTimingPolicy(prepared, instrument, options);
}

module.exports = { prepareOrderForSubmission, findApprovedInstrumentForTradeRow, executableRowToDraftOrder, prepareExecutableRowOrder };
