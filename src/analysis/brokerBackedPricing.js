const { estimateOrderSize, getDraftPrice } = require('./draftPricing');
const { fetchLatestPrice } = require('../brokers/interactive-brokers/pricing');

async function estimateOrderSizeWithBrokerFallback({ instrument, estimatedChf, portfolio = 'etf' }) {
  if (!instrument || instrument.tickerOrIsin === 'CASH-CHF') {
    return {
      quantity: 0,
      limitPrice: 0,
      estimatedOrderChf: estimatedChf || 0,
      sizingNote: 'Cash sleeve retained directly in CHF.',
      priceSource: 'cash_balance',
      currency: 'CHF',
      fxToChf: 1,
    };
  }

  if (instrument.ibkrConid) {
    const brokerQuote = await fetchLatestPrice({ conid: instrument.ibkrConid, portfolio });
    const sizing = estimateFromBrokerQuote({ instrument, estimatedChf, brokerQuote });
    if (sizing) return sizing;
  }

  const draft = getDraftPrice(instrument.tickerOrIsin);
  const fallback = estimateOrderSize({ tickerOrIsin: instrument.tickerOrIsin, estimatedChf });
  return {
    ...fallback,
    currency: draft?.currency || instrument.currency || null,
    fxToChf: draft?.fxToChf || instrument.fxToChfHint || null,
  };
}

function estimateFromBrokerQuote({ instrument, estimatedChf, brokerQuote }) {
  if (!brokerQuote?.ok) return null;
  const candidatePrice = brokerQuote.ask || brokerQuote.price || brokerQuote.last;
  const limitPrice = Number(candidatePrice);
  if (!Number.isFinite(limitPrice) || limitPrice <= 0) return null;

  const currency = brokerQuote.currency || instrument.currency || 'CHF';
  const fxToChf = currency === 'CHF' ? 1 : Number(instrument.fxToChfHint || 0);
  if (!Number.isFinite(fxToChf) || fxToChf <= 0) return null;

  const unitChf = limitPrice * fxToChf;
  const quantity = Math.floor(Number(estimatedChf || 0) / unitChf);
  const estimatedOrderChf = Number((quantity * unitChf).toFixed(2));

  return {
    quantity,
    limitPrice,
    estimatedOrderChf,
    sizingNote: quantity > 0
      ? `Sized with Interactive Brokers market data (ask ${limitPrice} ${currency}, FX ${fxToChf} to CHF).`
      : 'Estimated CHF amount is below one whole share using current Interactive Brokers market data.',
    priceSource: 'interactive-brokers-marketdata',
    currency,
    fxToChf,
  };
}

module.exports = { estimateOrderSizeWithBrokerFallback, estimateFromBrokerQuote };
