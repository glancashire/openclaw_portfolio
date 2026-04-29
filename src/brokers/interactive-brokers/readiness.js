const { InteractiveBrokersClient } = require('./client');

async function getInteractiveBrokersReadiness({ portfolio = 'etf' } = {}) {
  const client = new InteractiveBrokersClient({ portfolio });
  const config = client.configurationStatus();
  const auth = await client.authenticate();
  return summarizeReadiness({ config, auth });
}

function summarizeReadiness({ config, auth }) {
  return {
    configured: Boolean(config?.ok),
    authenticated: Boolean(auth?.ok),
    reachable: auth?.reason !== 'http_error' ? Boolean(auth?.ok) : false,
    fallbackRequired: !auth?.ok,
    reason: auth?.ok ? 'ready' : auth?.reason || 'unknown',
    message: auth?.ok
      ? 'Interactive Brokers read-only connectivity is available.'
      : auth?.reason === 'http_error'
        ? 'Interactive Brokers gateway/session is not reachable; broker-backed pricing falls back to draft assumptions.'
        : 'Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.',
  };
}

module.exports = { getInteractiveBrokersReadiness, summarizeReadiness };
