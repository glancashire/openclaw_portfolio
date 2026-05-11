const { InteractiveBrokersClient } = require('./client');
const { logBrokerEvent } = require('../shared/safeLogger');

async function fetchLatestPrice({ conid, portfolio = 'etf', appCode = null, preferBrowserSession = false }) {
  const client = new InteractiveBrokersClient({ portfolio });
  const auth = await client.authenticate();

  try {
    const raw = auth.ok && !preferBrowserSession
      ? await client.fetchMarketSnapshot([conid])
      : await fetchViaBrowserSession({ conid, portfolio, appCode, auth });
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
      reason: auth.ok ? 'http_error' : 'auth_failed',
      error: error.message,
      auth,
      log: logBrokerEvent({
        broker: 'interactive-brokers',
        operation: 'get_latest_price',
        status: 'http_error',
        summary: { conid, message: error.message },
        portfolio,
      }),
    };
  }
}

async function fetchViaBrowserSession({ conid, portfolio, appCode, auth }) {
  if (!appCode) {
    throw new Error('Interactive Brokers browser-session pricing requires appCode');
  }
  const { InteractiveBrokersBrowserSessionClient } = loadBrowserSessionClient();
  const browserClient = new InteractiveBrokersBrowserSessionClient({ portfolio });
  const response = await browserClient.fetchMarketSnapshot([conid], ['31', '84', '85', '86'], appCode);
  if (!response.ok) {
    throw new Error(`IBKR browser-session pricing failed (${response.status}): ${response.text}`);
  }
  return response.json;
}

function loadBrowserSessionClient() {
  try {
    return require('./browserSessionClient');
  } catch (error) {
    if (error && error.code === 'MODULE_NOT_FOUND' && String(error.message || '').includes("'playwright'")) {
      throw new Error('Interactive Brokers browser-session pricing requires the optional playwright dependency to be installed.');
    }
    throw error;
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

module.exports = { fetchLatestPrice, parseNumeric, readField, loadBrowserSessionClient };
