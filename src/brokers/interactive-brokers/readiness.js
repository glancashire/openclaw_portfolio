const { InteractiveBrokersClient } = require('./client');

async function getInteractiveBrokersReadiness({ portfolio = 'etf' } = {}) {
  const client = new InteractiveBrokersClient({ portfolio });
  const config = client.configurationStatus();
  const auth = await client.authenticate();
  const marketData = auth?.ok ? await detectMarketDataPosture(client).catch(() => null) : null;
  return summarizeReadiness({ config, auth, marketData });
}

async function detectMarketDataPosture(client) {
  try {
    const contracts = await client.searchContracts('IEF');
    const first = Array.isArray(contracts) ? contracts.find((row) => row?.conid) : null;
    if (!first?.conid) return { posture: 'unknown', detail: 'No probe contract conid available.' };
    const snapshot = await client.fetchMarketSnapshot([first.conid]);
    const quote = Array.isArray(snapshot) ? snapshot[0] : snapshot;
    const bid = asNumber(quote?.['84']);
    const ask = asNumber(quote?.['86']);
    const last = asNumber(quote?.['31']);
    const close = asNumber(quote?.close);
    if ([bid, ask, last].some(Number.isFinite)) {
      return { posture: 'live_or_realtime', detail: 'Live/realtime bid/ask/last values are available.' };
    }
    if (Number.isFinite(close)) {
      return { posture: 'delayed_only', detail: 'Delayed close fallback is available but live bid/ask/last are unavailable.' };
    }
    return { posture: 'unpriced', detail: 'Market data request succeeded but returned no usable price fields.' };
  } catch (error) {
    if (/Delayed market data is available/i.test(String(error?.message || ''))) {
      return { posture: 'delayed_only', detail: 'Interactive Brokers reports delayed market data is available.' };
    }
    return { posture: 'unknown', detail: String(error?.message || error || 'Unknown market data posture error.') };
  }
}

function summarizeReadiness({ config, auth, marketData }) {
  const delayedOnly = auth?.ok && marketData?.posture === 'delayed_only';
  const liveReady = auth?.ok && marketData?.posture === 'live_or_realtime';
  const authReadyButUnpriced = auth?.ok && !liveReady && !delayedOnly;
  return {
    configured: Boolean(config?.ok),
    authenticated: Boolean(auth?.ok),
    reachable: auth?.reason !== 'http_error' ? Boolean(auth?.ok) : false,
    fallbackRequired: !auth?.ok || delayedOnly || authReadyButUnpriced,
    marketDataMode: delayedOnly
      ? 'delayed'
      : liveReady
        ? 'live_or_realtime'
        : (authReadyButUnpriced ? (marketData?.posture || 'unpriced') : 'unavailable'),
    reason: liveReady
      ? 'ready'
      : delayedOnly
        ? 'delayed_data_only'
        : authReadyButUnpriced
          ? (marketData?.posture || 'unpriced')
          : auth?.reason || 'unknown',
    message: liveReady
      ? 'Interactive Brokers read-only connectivity and live/realtime market data are available.'
      : delayedOnly
        ? 'Interactive Brokers connectivity is available, but API pricing is delayed-only; broker-backed pricing may use delayed fallback values and live submission should remain blocked.'
        : authReadyButUnpriced
          ? 'Interactive Brokers connectivity is available, but broker-backed pricing is not yet yielding a usable live/delayed quote posture.'
          : auth?.reason === 'http_error'
            ? 'Interactive Brokers gateway/session is not reachable; broker-backed pricing falls back to draft assumptions.'
            : 'Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.',
  };
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

module.exports = { getInteractiveBrokersReadiness, summarizeReadiness, detectMarketDataPosture };
