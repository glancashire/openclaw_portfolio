const { applyExecutionTimingPolicy } = require('./orderTimingPolicy');

function normalizedUpper(value) {
  return String(value || '').trim().toUpperCase();
}

function prepareOrderForSubmission(order = {}, instrument = null) {
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
  return applyExecutionTimingPolicy(prepared, instrument);
}

module.exports = { prepareOrderForSubmission };
