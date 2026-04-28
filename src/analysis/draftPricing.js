const DEFAULT_DRAFT_PRICES = {
  IE00B5BMR087: { currency: 'USD', price: 600, fxToChf: 0.9, source: 'draft_assumption' },
  LU0950668870: { currency: 'EUR', price: 30, fxToChf: 0.96, source: 'draft_assumption' },
  CH0032912732: { currency: 'CHF', price: 120, fxToChf: 1, source: 'draft_assumption' },
};

function getDraftPrice(tickerOrIsin) {
  return DEFAULT_DRAFT_PRICES[tickerOrIsin] || null;
}

function estimateOrderSize({ tickerOrIsin, estimatedChf }) {
  const draft = getDraftPrice(tickerOrIsin);
  if (!draft || !estimatedChf) {
    return {
      quantity: 0,
      limitPrice: 0,
      estimatedOrderChf: estimatedChf || 0,
      sizingNote: 'No draft price available yet.',
      priceSource: draft?.source || 'unavailable',
    };
  }

  const unitChf = draft.price * draft.fxToChf;
  const quantity = Math.floor(estimatedChf / unitChf);
  const estimatedOrderChf = Number((quantity * unitChf).toFixed(2));
  return {
    quantity,
    limitPrice: draft.price,
    estimatedOrderChf,
    sizingNote: quantity > 0
      ? `Sized with draft price assumptions (${draft.price} ${draft.currency}, FX ${draft.fxToChf} to CHF).`
      : 'Estimated CHF amount is below one whole share using current draft price assumptions.',
    priceSource: draft.source,
  };
}

module.exports = { getDraftPrice, estimateOrderSize };
