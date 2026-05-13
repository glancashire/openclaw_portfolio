const path = require('path');
const { writeHoldingsSnapshot } = require('../shared/holdingsSnapshot');
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

  const ledger = await client.fetchLedger(resolvedAccountId);
  const positions = await client.fetchPositions(resolvedAccountId);
  const holdings = Array.isArray(positions)
    ? positions
        .map(normaliseHolding)
        .filter((holding) => {
          const quantity = Number(holding?.quantity || 0);
          const ticker = String(holding?.ticker || '').trim().toUpperCase();
          const name = String(holding?.name || '').trim().toUpperCase();
          const looksLikeFxHelper = ticker.includes('.') || name.includes('.') || ticker.includes('CASH') || name.includes('CASH');
          return !(quantity === 0 && looksLikeFxHelper);
        })
    : [];
  const cashChf = extractCashChf(ledger);
  const result = writeHoldingsSnapshot({
    portfolioDir,
    holdings,
    cashChf,
    source: 'broker_api',
    broker: 'interactive-brokers',
    normaliseHolding: (h) => h,
  });

  return {
    ok: true,
    accountId: resolvedAccountId,
    cashChf,
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

function extractCashChf(ledger) {
  if (!ledger) return 0;

  if (Array.isArray(ledger)) {
    const preferred = ['TotalCashValue', 'SettledCash', 'CashBalance', 'AvailableFunds', 'NetLiquidation'];
    for (const tag of preferred) {
      const row = ledger.find((entry) => entry && entry.currency === 'CHF' && entry.tag === tag);
      const value = Number(row?.value);
      if (Number.isFinite(value)) return value;
    }
    return 0;
  }

  if (typeof ledger !== 'object') return 0;
  const chf = ledger.CHF || ledger.chf || null;
  if (chf && typeof chf === 'object') {
    const candidates = [chf.cashbalance, chf.cashBalance, chf.settledcash, chf.settledCash, chf.totalcashvalue, chf.totalCashValue, chf.availablefunds, chf.availableFunds, chf.netliquidationvalue, chf.netLiquidationValue];
    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value)) return value;
    }
  }
  return 0;
}

module.exports = { syncInteractiveBrokersHoldings, extractCashChf };
