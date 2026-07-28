'use strict';

// Phase D1 — FX cash reconciliation.
//
// The legacy `extractCashChf()` in the IBKR holdings sync collapses the broker
// ledger down to a single CHF cash figure and discards every non-CHF cash
// sleeve. That is fine for a CHF-only account but hides FX cash drift the moment
// the account holds EUR/USD/GBP settlement balances (which it does after any
// foreign-currency ETF trade settles).
//
// This module is additive and read-only: it reconstructs per-currency cash from
// the same ledger, applies FX-to-CHF, and produces a reconciliation object with
// explicit drift flags. It never mutates the ledger and never changes the
// canonical CHF totals path the existing tests depend on.

const CASH_TAGS = ['CashBalance', 'SettledCash', 'TotalCashValue', 'AvailableFunds'];

function pickCashTag(detail) {
  for (const tag of CASH_TAGS) {
    const value = Number(detail[tag]);
    if (Number.isFinite(value)) return { value, basis: tag };
  }
  return { value: 0, basis: 'missing' };
}

// Build { CUR: { value, basis, detail } } for every currency present in the
// ledger. Accepts the array-of-rows ledger shape (IBKR summary rows) and the
// keyed-object shape used by some fixtures.
function extractCashByCurrency(ledger) {
  const out = {};
  if (Array.isArray(ledger)) {
    const byCurrency = {};
    for (const entry of ledger) {
      if (!entry) continue;
      const currency = String(entry.currency || '').trim().toUpperCase();
      if (!currency) continue;
      // 'BASE' is IBKR's account-base summary pseudo-currency; skip it so it
      // does not masquerade as a real cash sleeve.
      if (currency === 'BASE') continue;
      const tag = String(entry.tag || '');
      if (!CASH_TAGS.includes(tag)) continue;
      byCurrency[currency] = byCurrency[currency] || {};
      byCurrency[currency][tag] = Number(entry.value);
    }
    for (const [currency, detail] of Object.entries(byCurrency)) {
      const { value, basis } = pickCashTag(detail);
      out[currency] = { value, basis, detail };
    }
    return out;
  }

  if (ledger && typeof ledger === 'object') {
    for (const [rawCur, node] of Object.entries(ledger)) {
      const currency = String(rawCur || '').trim().toUpperCase();
      if (!currency || currency === 'BASE') continue;
      if (!node || typeof node !== 'object') continue;
      const detail = {
        CashBalance: Number(node.cashbalance ?? node.cashBalance),
        SettledCash: Number(node.settledcash ?? node.settledCash),
        TotalCashValue: Number(node.totalcashvalue ?? node.totalCashValue),
        AvailableFunds: Number(node.availablefunds ?? node.availableFunds),
      };
      const { value, basis } = pickCashTag(detail);
      out[currency] = { value, basis, detail };
    }
  }
  return out;
}

function resolveFxRate(currency, fxRates) {
  if (currency === 'CHF') return 1;
  const rate = Number(fxRates?.[currency]);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

// Reconcile per-currency broker cash into CHF, and compare the summed CHF cash
// against the single-figure CHF cash the legacy path reported. `driftChf` is the
// difference the legacy CHF-only path was silently dropping.
//
// options:
//   ledger           broker ledger (array or keyed object)
//   fxRates          { CUR: rateToChf } (CHF implicitly 1)
//   brokerCashChf    the legacy single-figure broker CHF cash (extractCashChf)
//   toleranceChf     drift under this is treated as clean (default 1.0 CHF)
function reconcileCash({ ledger, fxRates = {}, brokerCashChf = null, toleranceChf = 1.0 } = {}) {
  const byCurrency = extractCashByCurrency(ledger);
  const rows = [];
  const missingFx = [];
  let totalChf = 0;

  const currencies = Object.keys(byCurrency).sort((a, b) => {
    if (a === 'CHF') return -1;
    if (b === 'CHF') return 1;
    return a.localeCompare(b);
  });

  for (const currency of currencies) {
    const { value, basis } = byCurrency[currency];
    const fx = resolveFxRate(currency, fxRates);
    const valueChf = fx != null ? Number((value * fx).toFixed(2)) : null;
    if (fx == null) missingFx.push(currency);
    else totalChf += valueChf;
    rows.push({ currency, amount: value, basis, fxToChf: fx, valueChf });
  }

  totalChf = Number(totalChf.toFixed(2));

  const hasBrokerCashChf = Number.isFinite(Number(brokerCashChf));
  const driftChf = hasBrokerCashChf ? Number((totalChf - Number(brokerCashChf)).toFixed(2)) : null;

  const flags = [];
  if (missingFx.length) flags.push(`missing_fx:${missingFx.join(',')}`);
  if (driftChf != null && Math.abs(driftChf) > toleranceChf) {
    flags.push(`chf_cash_drift:${driftChf}`);
  }
  const nonChf = rows.filter((r) => r.currency !== 'CHF' && Number(r.amount) !== 0);
  if (nonChf.length) flags.push(`non_chf_cash:${nonChf.map((r) => r.currency).join(',')}`);

  return {
    rows,
    totalChf,
    brokerCashChf: hasBrokerCashChf ? Number(brokerCashChf) : null,
    driftChf,
    missingFx,
    reconciled: flags.filter((f) => f.startsWith('chf_cash_drift') || f.startsWith('missing_fx')).length === 0,
    flags,
  };
}

// Render the reconciliation as a markdown section for holdings.md. Additive:
// only emitted when there is real multi-currency cash or a drift/flag to show.
function formatCashReconciliationSection(recon) {
  if (!recon || !Array.isArray(recon.rows) || !recon.rows.length) return '';
  const meaningful = recon.rows.some((r) => r.currency !== 'CHF' && Number(r.amount) !== 0)
    || (recon.driftChf != null && recon.driftChf !== 0)
    || recon.missingFx.length > 0;
  if (!meaningful) return '';

  const lines = [];
  lines.push('## Cash Reconciliation (by currency)');
  lines.push('| Currency | Amount | FX rate to CHF | Value CHF | Basis |');
  lines.push('|---|---:|---:|---:|---|');
  for (const row of recon.rows) {
    lines.push(`| ${row.currency} | ${row.amount} | ${row.fxToChf ?? ''} | ${row.valueChf ?? ''} | ${row.basis} |`);
  }
  lines.push('');
  lines.push(`- Reconciled total cash CHF: ${recon.totalChf}`);
  if (recon.brokerCashChf != null) {
    lines.push(`- Legacy broker CHF-only cash: ${recon.brokerCashChf}`);
    lines.push(`- Drift CHF (multi-currency − CHF-only): ${recon.driftChf}`);
  }
  lines.push(`- Reconciled cleanly: ${recon.reconciled ? 'yes' : 'no'}`);
  if (recon.flags.length) lines.push(`- Flags: ${recon.flags.join(', ')}`);
  return lines.join('\n');
}

module.exports = {
  extractCashByCurrency,
  reconcileCash,
  formatCashReconciliationSection,
  __test__: { pickCashTag, resolveFxRate, CASH_TAGS },
};
