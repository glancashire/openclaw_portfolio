const fs = require('fs');
const path = require('path');
const { writeHoldingsSnapshot } = require('../shared/holdingsSnapshot');
const { InteractiveBrokersClient } = require('./client');
const { normaliseHolding } = require('./types');
const { readApprovedInstruments } = require('../../analysis/approvedInstruments');
const { runWithIbkrSyncGuard } = require('./syncGuard');
const { regenerateDashboard } = require('../../reporting/dashboardGenerator');

async function syncInteractiveBrokersHoldings({ portfolioDir, accountId }) {
  return runWithIbkrSyncGuard({ portfolioDir, operation: 'holdings_sync' }, async () => {
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
  const liveFxRates = extractFxRatesToChf(ledger);

  // Use IBKR NetLiquidation as authoritative CHF total, then scale the
  // per-currency static hints (from portfolio.md) so the computed total
  // matches IBKR's live-FX-converted value exactly.
  const netLiq = Number(cash.detail?.NetLiquidation);
  if (Number.isFinite(netLiq) && netLiq > 0 && holdings.length > 0) {
    const byCurrency = {};
    for (const h of holdings) {
      const ccy = String(h.currency || 'CHF').toUpperCase();
      if (!byCurrency[ccy]) byCurrency[ccy] = { nativeTotal: 0, holdings: [] };
      const nativeValue = (h.price || 0) * (h.quantity || 0);
      byCurrency[ccy].nativeTotal += nativeValue;
      byCurrency[ccy].holdings.push(h);
    }
    const chfInvested = (byCurrency.CHF?.nativeTotal || 0);
    const foreignChfBudget = netLiq - cash.value - chfInvested;
    if (foreignChfBudget > 0) {
      // Use per-currency hints from portfolio.md as seed rates
      const portfolioPath = path.join(portfolioDir, 'portfolio.md');
      const approvedInstruments = fs.existsSync(portfolioPath) ? readApprovedInstruments(portfolioPath) : [];
      const fxHintsByCurrency = {};
      for (const inst of approvedInstruments) {
        const ccy = String(inst.currency || 'CHF').toUpperCase();
        if (ccy !== 'CHF' && !fxHintsByCurrency[ccy] && inst.fxToChfHint > 0) {
          fxHintsByCurrency[ccy] = inst.fxToChfHint;
        }
      }
      let staticChfTotal = 0;
      for (const [ccy, group] of Object.entries(byCurrency)) {
        if (ccy === 'CHF') continue;
        const seedRate = liveFxRates[ccy] || fxHintsByCurrency[ccy] || 1;
        group.seedRate = seedRate;
        staticChfTotal += group.nativeTotal * seedRate;
      }
      // Single correction factor preserves relative ratios between currencies
      const scaleFactor = staticChfTotal > 0 ? foreignChfBudget / staticChfTotal : 1;
      for (const [ccy, group] of Object.entries(byCurrency)) {
        if (ccy === 'CHF') continue;
        const effectiveRate = Number((group.seedRate * scaleFactor).toFixed(6));
        for (const h of group.holdings) h.fxRateToChf = effectiveRate;
      }
    }
    if (byCurrency.CHF) {
      for (const h of byCurrency.CHF.holdings) h.fxRateToChf = 1;
    }
  } else {
    // Fallback: use static rates from ledger if available
    for (const h of holdings) {
      const ccy = String(h.currency || 'CHF').toUpperCase();
      if (liveFxRates[ccy] != null) h.fxRateToChf = liveFxRates[ccy];
    }
  }

  const preserved = preservePreviousHoldingsSnapshotIfNeeded({
    portfolioDir,
    authOk: Boolean(auth?.ok),
    accountId: resolvedAccountId,
    holdings,
    cashChf: cash.value,
    positionsRaw: positions,
    ledgerRaw: ledger,
  });
  if (preserved) return preserved;

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

  const dashboardPath = await regenerateDashboard(portfolioDir);

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
    dashboardPath,
  };
  });
}

async function enrichPositionsWithMarketSnapshot(client, positions = []) {
  const conids = [...new Set(positions.map((row) => row?.conid || row?.contract?.conId).filter(Boolean))];
  if (!conids.length) return positions;

  // Fetch snapshots individually so one failure doesn't block the rest
  const snapshotByConid = new Map();
  for (const conid of conids) {
    try {
      const snaps = await client.fetchMarketSnapshot([conid]);
      if (Array.isArray(snaps) && snaps.length > 0) {
        snapshotByConid.set(String(conid), snaps[0]);
      }
    } catch {
      // Skip conids that fail (e.g. FX helper positions)
    }
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

function shouldPreservePreviousHoldingsSnapshot({ authOk, accountId, holdings = [], cashChf = 0, positionsRaw = [], ledgerRaw = [] } = {}) {
  if (!authOk || !accountId) return false;
  const hasHoldings = Array.isArray(holdings) && holdings.length > 0;
  const hasPositions = Array.isArray(positionsRaw) && positionsRaw.length > 0;
  const hasLedger = Array.isArray(ledgerRaw) && ledgerRaw.length > 0;
  const hasCash = Number.isFinite(Number(cashChf)) && Number(cashChf) > 0;
  return !hasHoldings && !hasPositions && !hasLedger && !hasCash;
}

function preservePreviousHoldingsSnapshotIfNeeded({ portfolioDir, ...state } = {}) {
  if (!shouldPreservePreviousHoldingsSnapshot(state)) return null;
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  if (!fs.existsSync(holdingsPath)) return null;
  return {
    ok: false,
    reason: 'preserved_last_known_good',
    message: 'Degraded broker read returned empty holdings/cash after successful auth; preserved last-known-good holdings snapshot.',
    preservedPath: holdingsPath,
  };
}

module.exports = { syncInteractiveBrokersHoldings, extractCashChf, extractFxRatesToChf, enrichPositionsWithMarketSnapshot, preferredSnapshotPrice, snapshotPriceSource, shouldPreservePreviousHoldingsSnapshot, preservePreviousHoldingsSnapshotIfNeeded };
