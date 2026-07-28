'use strict';

const { fetchExternalLastClose } = require('../externalFallback');

module.exports = {
  id: 'yahoo_last_close',
  label: 'Yahoo Finance last close',
  async fetchQuote(context = {}) {
    const result = await fetchExternalLastClose({ instrument: context.instrument || null, externalSymbol: context.externalSymbol || null });
    if (!result?.ok) {
      return {
        ok: false,
        reason: result?.reason || 'yahoo_failed',
        note: result?.message || 'Yahoo Finance fallback unavailable.',
        raw: result || null,
      };
    }
    return {
      ok: true,
      price: result.close,
      close: result.close,
      currency: result.currency || null,
      providerPath: result.source || 'yahoo_last_close',
      providerLabel: 'Yahoo Finance last close',
      quality: 'last_close',
      asOf: result.asOf || null,
      note: result.note || 'Resolved from Yahoo Finance chart close series.',
      externalSymbol: result.externalSymbol || context.externalSymbol || null,
      raw: result,
    };
  },
};
