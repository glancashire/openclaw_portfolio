'use strict';

const fs = require('fs');
const path = require('path');

const POLICY_PATH = path.join(__dirname, '..', 'config', 'etf-quality-policy.json');

function loadPolicy() {
  return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
}

/**
 * Known ETF metadata. In production this would come from a data provider.
 * For now, manually curated from justETF research.
 */
const ETF_METADATA = {
  SLICHA: { isin: 'CH0032912732', name: 'UBS ETF SLI', replication: 'physical', terPct: 0.20, currency: 'CHF', exchange: 'EBS', index: 'SLI', fundSizeEurM: 2239 },
  EMUAA: { isin: 'LU0950668870', name: 'UBS Core MSCI EMU', replication: 'physical', terPct: 0.09, currency: 'EUR', exchange: 'EBS', index: 'MSCI EMU', fundSizeEurM: 4039 },
  VUSA: { isin: 'IE00B3XXRP09', name: 'Vanguard S&P 500 Dist', replication: 'physical', terPct: 0.07, currency: 'CHF', exchange: 'EBS', index: 'S&P 500', fundSizeEurM: 43161 },
  CSPX: { isin: 'IE00B5BMR087', name: 'iShares Core S&P 500 Acc', replication: 'physical', terPct: 0.07, currency: 'USD', exchange: 'LSEETF', index: 'S&P 500', fundSizeEurM: 96000 },
  SXR8: { isin: 'IE00B5BMR087', name: 'iShares Core S&P 500 (Xetra)', replication: 'physical', terPct: 0.07, currency: 'EUR', exchange: 'IBIS2', index: 'S&P 500', fundSizeEurM: 96000 },
  SPY5: { isin: 'IE00BM67HT60', name: 'SPDR S&P 500 CHF Hedged', replication: 'physical', terPct: 0.12, currency: 'CHF', exchange: 'EBS', index: 'S&P 500 CHF Hedged', fundSizeEurM: 800 },
};

/**
 * Validate a single instrument against the quality policy.
 * @param {string} symbol
 * @param {object} [policy] - override policy
 * @returns {{ pass: boolean, reasons: string[] }}
 */
function validateInstrumentQuality(symbol, policy) {
  policy = policy || loadPolicy();
  const meta = ETF_METADATA[symbol];
  const reasons = [];

  if (!meta) {
    return { pass: false, reasons: [`Unknown instrument: ${symbol} — no metadata available`] };
  }

  if (policy.replicationMethod === 'physical' && meta.replication !== 'physical') {
    reasons.push(`Replication is "${meta.replication}" — policy requires physical`);
  }

  if (policy.maxTerPct && meta.terPct > policy.maxTerPct) {
    reasons.push(`TER ${meta.terPct}% exceeds max ${policy.maxTerPct}%`);
  }

  return { pass: reasons.length === 0, reasons, meta };
}

/**
 * Filter candidates to only physical replication ETFs.
 * @param {string[]} symbols
 * @returns {string[]}
 */
function filterByReplication(symbols) {
  return symbols.filter(s => {
    const meta = ETF_METADATA[s];
    return meta && meta.replication === 'physical';
  });
}

/**
 * Rank candidates by TER (ascending).
 * @param {string[]} symbols
 * @returns {Array<{symbol: string, terPct: number, name: string}>}
 */
function rankByTer(symbols) {
  return symbols
    .map(s => ({ symbol: s, ...(ETF_METADATA[s] || {}) }))
    .filter(x => x.terPct != null)
    .sort((a, b) => a.terPct - b.terPct);
}

/**
 * Validate all instruments in a trade list.
 * @param {Array<{symbol: string}>} trades
 * @returns {{ allPass: boolean, results: Array }}
 */
function validateTradeList(trades) {
  const policy = loadPolicy();
  const results = trades.map(t => ({
    symbol: t.symbol,
    ...validateInstrumentQuality(t.symbol, policy),
  }));
  return { allPass: results.every(r => r.pass), results };
}

module.exports = { validateInstrumentQuality, filterByReplication, rankByTer, validateTradeList, ETF_METADATA, loadPolicy };
