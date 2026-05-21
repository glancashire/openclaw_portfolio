const { isMarketOpen, nextOpenTime } = require('../../lib/marketHours');

function resolveVenueAwareMarketWindow({ diagnostics = [] } = {}) {
  const first = diagnostics[0] || null;
  const exchange = first?.preparedOrder?.primaryExchange || first?.approvedInstrument?.ibkrPrimaryExchange || 'EBS';
  const instrumentLabel = first?.preparedOrder?.symbol || first?.tickerOrIsin || null;
  const market = isMarketOpen(exchange);
  return {
    exchange,
    instrumentLabel,
    openNow: Boolean(market.open),
    reason: market.reason,
    nextOpen: nextOpenTime(exchange),
  };
}

module.exports = {
  resolveVenueAwareMarketWindow,
};
