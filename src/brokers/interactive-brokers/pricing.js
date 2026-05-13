const { InteractiveBrokersClient } = require('./client');
const { logBrokerEvent } = require('../shared/safeLogger');

async function fetchLatestPrice({ conid, portfolio = 'etf' }) {
  const client = new InteractiveBrokersClient({ portfolio });
  const auth = await client.authenticate();

  try {
    const raw = await client.fetchMarketSnapshot([conid]);
    const first = Array.isArray(raw) ? raw[0] : raw;
    const price = parseNumeric(readField(first, '31'));
    const bid = parseNumeric(readField(first, '84'));
    const ask = parseNumeric(readField(first, '86'));
    const last = parseNumeric(readField(first, '31'));
    const delayedClose = parseNumeric(readField(first, '7295'));
    const nativeClose = parseNumeric(first?.close);
    const close = Number.isFinite(delayedClose) && delayedClose > 0
      ? delayedClose
      : Number.isFinite(nativeClose) && nativeClose > 0
        ? nativeClose
        : null;
    const currency = readField(first, '85') ?? first?.currency ?? null;
    return {
      ok: true,
      conid,
      price,
      bid,
      ask,
      last,
      close,
      currency,
      raw: first,
      log: logBrokerEvent({
        broker: 'interactive-brokers',
        operation: 'get_latest_price',
        status: 'ok',
        summary: { conid, price, currency },
        portfolio,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      reason: auth.ok ? 'native_price_error' : 'auth_failed',
      error: error.message,
      auth,
      guidance: 'Use native market-data probes or raw contract details before attempting any browser-session fallback.',
      log: logBrokerEvent({
        broker: 'interactive-brokers',
        operation: 'get_latest_price',
        status: 'native_price_error',
        summary: { conid, message: error.message },
        portfolio,
      }),
    };
  }
}

function readField(object, key) {
  if (!object || typeof object !== 'object') return null;
  return object[key] ?? null;
}

function parseNumeric(value) {
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

module.exports = { fetchLatestPrice, parseNumeric, readField };
