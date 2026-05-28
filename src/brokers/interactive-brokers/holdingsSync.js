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
  const enrichedPositions = Array.isArray(positions)
    ? await enrichPositionsWithMarketSnapshot(client, positions)
    : [];
  const holdings = Array.isArray(enrichedPositions)
    ? enrichedPositions
        .map(normaliseHolding)
        .filter((holding) => {
          const quantity = Number(holding?.quantity || 0);
          const ticker = String(holding?.ticker || '').trim().toUpperCase();
          const name = String(holding?.name || '').trim().toUpperCase();
          const looksLikeFxHelper = ticker.includes('.') || name.includes('.') || ticker.includes('CASH') || name.includes('CASH');
          return !(quantity === 0 && looksLikeFxHelper);
        })
    : [];
  const cash = extractCashChf(ledger);
  const result = writeHoldingsSnapshot({
    portfolioDir,
    holdings,
    cashChf: cash.value,
    cashBasis: cash.basis,
    cashDetail: cash.detail,
    portfolioCashChf: null,
    portfolioCashBasis: 'broker_reported',
    source: 'broker_api',
    broker: 'interactive-brokers',
    normaliseHolding: (h) => h,
  });

  return {
    ok: true,
    accountId: resolvedAccountId,
    cashChf: cash.value,
    cashBasis: cash.basis,
    cashDetail: cash.detail,
    portfolioCashChf: null,
    portfolioCashBasis: 'broker_reported',
    count: holdings.length,
    result,
  };
}

async function enrichPositionsWithMarketSnapshot(client, positions = []) {
  const conids = [...new Set(positions.map((row) => row?.conid || row?.contract?.conId).filter(Boolean))];
  if (!conids.length) return positions;

  let snapshots = [];
  try {
    snapshots = await client.fetchMarketSnapshot(conids);
  } catch {
    return positions;
  }

  const snapshotByConid = new Map();
  for (const row of Array.isArray(snapshots) ? snapshots : []) {
    const conid = String(row?.conid || row?.conId || '').trim();
    if (!conid) continue;
    snapshotByConid.set(conid, row);
  }

  return positions.map((position) => {
    const conid = String(position?.conid || position?.contract?.conId || '').trim();
    const snapshot = conid ? snapshotByConid.get(conid) : null;
    if (!snapshot) return position;
    const marketPrice = preferredSnapshotPrice(snapshot);
    const marketValue = Number.isFinite(marketPrice)
      ? Number((marketPrice * Number(position?.position ?? position?.quantity ?? 0)).toFixed(8))
      : null;
    return {
      ...position,
      mktPrice: Number.isFinite(marketPrice) ? marketPrice : position.mktPrice,
      mktValue: Number.isFinite(marketValue) ? marketValue : position.mktValue,
      marketPriceSource: snapshotPriceSource(snapshot),
      marketSnapshotRaw: snapshot,
    };
  });
}

function preferredSnapshotPrice(snapshot = {}) {
  const bid = Number(snapshot?.['84']);
  const ask = Number(snapshot?.['86']);
  const last = Number(snapshot?.['31']);
  const close = Number(snapshot?.close);
  if (Number.isFinite(last) && last > 0) return last;
  if (Number.isFinite(bid) && bid > 0 && Number.isFinite(ask) && ask > 0) return Number(((bid + ask) / 2).toFixed(8));
  if (Number.isFinite(ask) && ask > 0) return ask;
  if (Number.isFinite(bid) && bid > 0) return bid;
  if (Number.isFinite(close) && close > 0) return close;
  return null;
}

function snapshotPriceSource(snapshot = {}) {
  const bid = Number(snapshot?.['84']);
  const ask = Number(snapshot?.['86']);
  const last = Number(snapshot?.['31']);
  const close = Number(snapshot?.close);
  if (Number.isFinite(last) && last > 0) return 'last';
  if (Number.isFinite(bid) && bid > 0 && Number.isFinite(ask) && ask > 0) return 'mid';
  if (Number.isFinite(ask) && ask > 0) return 'ask';
  if (Number.isFinite(bid) && bid > 0) return 'bid';
  if (Number.isFinite(close) && close > 0) return 'close';
  return 'unknown';
}

function firstAccountId(accounts) {
  if (Array.isArray(accounts) && accounts.length) {
    const first = accounts[0];
    return first.id || first.accountId || first.account || null;
  }
  return null;
}

function extractFxRatesToChf(ledger) {
  const rates = { CHF: 1 };
  if (!Array.isArray(ledger)) return rates;
  for (const entry of ledger) {
    if (!entry || String(entry.tag || '') !== 'ExchangeRate') continue;
    const currency = String(entry.currency || '').trim().toUpperCase();
    const value = Number(entry.value);
    if (!currency || !Number.isFinite(value) || value <= 0) continue;
    rates[currency] = value;
  }
  return rates;
}

function extractCashChf(ledger) {
  if (!ledger) return { value: 0, basis: 'missing', detail: {} };

  if (Array.isArray(ledger)) {
    const chfRows = ledger.filter((entry) => entry && entry.currency === 'CHF');
    const detail = Object.fromEntries(chfRows.map((row) => [row.tag, Number(row.value)]));
    const preferred = ['CashBalance', 'SettledCash', 'TotalCashValue', 'AvailableFunds'];
    for (const tag of preferred) {
      const value = Number(detail[tag]);
      if (Number.isFinite(value)) {
        return { value, basis: tag, detail };
      }
    }
    return { value: 0, basis: 'missing', detail };
  }

  if (typeof ledger !== 'object') return { value: 0, basis: 'invalid', detail: {} };
  const chf = ledger.CHF || ledger.chf || null;
  if (chf && typeof chf === 'object') {
    const detail = {
      CashBalance: Number(chf.cashbalance ?? chf.cashBalance),
      SettledCash: Number(chf.settledcash ?? chf.settledCash),
      TotalCashValue: Number(chf.totalcashvalue ?? chf.totalCashValue),
      AvailableFunds: Number(chf.availablefunds ?? chf.availableFunds),
      NetLiquidation: Number(chf.netliquidationvalue ?? chf.netLiquidationValue),
    };
    for (const tag of ['CashBalance', 'SettledCash', 'TotalCashValue', 'AvailableFunds']) {
      const value = Number(detail[tag]);
      if (Number.isFinite(value)) {
        return { value, basis: tag, detail };
      }
    }
    return { value: 0, basis: 'missing', detail };
  }
  return { value: 0, basis: 'missing', detail: {} };
}

module.exports = { syncInteractiveBrokersHoldings, extractCashChf, extractFxRatesToChf, enrichPositionsWithMarketSnapshot, preferredSnapshotPrice, snapshotPriceSource };
