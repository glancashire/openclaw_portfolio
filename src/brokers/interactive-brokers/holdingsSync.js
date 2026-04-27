const path = require('path');
const { writeHoldingsSnapshot } = require('../ig/holdingsSync');
const { InteractiveBrokersClient } = require('./client');
const { normaliseHolding } = require('./types');

async function syncInteractiveBrokersHoldings({ portfolioDir, accountId }) {
  const client = new InteractiveBrokersClient({ portfolio: path.basename(portfolioDir) });
  const auth = await client.authenticate();
  if (!auth.ok) {
    return { ok: false, auth };
  }

  const accounts = await client.fetchAccounts();
  const resolvedAccountId = accountId || client.config.accountId || firstAccountId(accounts);
  if (!resolvedAccountId) {
    return { ok: false, reason: 'no_account_id', accounts };
  }

  const positions = await client.fetchPositions(resolvedAccountId);
  const holdings = Array.isArray(positions) ? positions.map(normaliseHolding) : [];
  const result = writeHoldingsSnapshot({
    portfolioDir,
    holdings,
    cashChf: 0,
    source: 'broker_api',
    broker: 'interactive-brokers',
  });

  return {
    ok: true,
    accountId: resolvedAccountId,
    count: holdings.length,
    result,
  };
}

function firstAccountId(accounts) {
  if (Array.isArray(accounts) && accounts.length) {
    const first = accounts[0];
    return first.id || first.accountId || first.account || null;
  }
  return null;
}

module.exports = { syncInteractiveBrokersHoldings };
