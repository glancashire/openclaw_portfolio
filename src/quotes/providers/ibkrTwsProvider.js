'use strict';

const { fetchLatestPrice } = require('../../brokers/interactive-brokers/pricing');

module.exports = {
  id: 'ibkr_tws',
  label: 'IBKR TWS API',
  async fetchQuote(context = {}) {
    if (!context.conid) {
      return { ok: false, reason: 'missing_conid', note: 'IBKR TWS provider requires conid.' };
    }
    const result = await fetchLatestPrice({ conid: context.conid, portfolio: context.portfolio || 'etf' });
    if (!result?.ok) {
      return {
        ok: false,
        reason: result?.reason || 'ibkr_tws_failed',
        note: result?.error || result?.guidance || 'IBKR TWS quote fetch failed.',
        raw: result || null,
      };
    }
    const price = result.ask || result.price || result.last || result.close || null;
    return {
      ok: true,
      price,
      bid: result.bid,
      ask: result.ask,
      last: result.last,
      close: result.close,
      currency: result.currency || null,
      providerPath: 'ibkr_tws',
      providerLabel: 'IBKR TWS API',
      quality: result.ask || result.bid || result.last ? 'live_or_realtime' : (result.close ? 'last_close' : 'stale_or_unknown'),
      asOf: new Date().toISOString(),
      note: result.close && !(result.ask || result.bid || result.last)
        ? 'Resolved from IBKR TWS delayed/close-style snapshot fallback.'
        : 'Resolved from IBKR TWS/native market snapshot.',
      raw: result.raw || result,
    };
  },
};
