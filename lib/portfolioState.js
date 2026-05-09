'use strict';

/**
 * Portfolio state persistence.
 * Saves and loads portfolio state to/from disk.
 */

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'runtime', 'portfolio-state.json');
const NAV_HISTORY_FILE = path.join(__dirname, '..', 'runtime', 'nav-history.jsonl');

/**
 * Load portfolio state from disk.
 * @returns {object|null}
 */
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save portfolio state to disk.
 * @param {object} state - { holdings, cashChf, totalValueChf, lastUpdated, driftSnapshot }
 */
function saveState(state) {
  state.lastUpdated = new Date().toISOString();
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  return state;
}

/**
 * Update state after a fill.
 * @param {object} fill - { symbol, qty, price, currency, action }
 */
function updateStateAfterFill(fill) {
  const state = loadState() || { holdings: [], cashChf: 5000, totalValueChf: 5000 };

  if (fill.action === 'BUY') {
    const existing = state.holdings.find(h => h.symbol === fill.symbol);
    const cost = fill.qty * fill.price;
    if (existing) {
      existing.qty += fill.qty;
      existing.avgPrice = ((existing.avgPrice * (existing.qty - fill.qty)) + cost) / existing.qty;
      existing.marketValue = existing.qty * fill.price;
    } else {
      state.holdings.push({
        symbol: fill.symbol,
        qty: fill.qty,
        avgPrice: fill.price,
        marketValue: cost,
        currency: fill.currency,
      });
    }
    state.cashChf -= cost;
  } else if (fill.action === 'SELL') {
    const existing = state.holdings.find(h => h.symbol === fill.symbol);
    if (existing) {
      existing.qty -= fill.qty;
      existing.marketValue = existing.qty * fill.price;
      if (existing.qty <= 0) {
        state.holdings = state.holdings.filter(h => h.symbol !== fill.symbol);
      }
    }
    state.cashChf += fill.qty * fill.price;
  }

  state.totalValueChf = state.cashChf + state.holdings.reduce((sum, h) => sum + (h.marketValue || 0), 0);
  return saveState(state);
}

/**
 * Append NAV snapshot to history.
 * @param {object} [stateOverride] - Use instead of loading from disk
 */
function appendNavHistory(stateOverride) {
  const state = stateOverride || loadState();
  if (!state) return;

  const entry = {
    date: new Date().toISOString().slice(0, 10),
    timestamp: new Date().toISOString(),
    totalValueChf: state.totalValueChf,
    cashChf: state.cashChf,
    holdingsCount: state.holdings.length,
  };

  fs.mkdirSync(path.dirname(NAV_HISTORY_FILE), { recursive: true });
  fs.appendFileSync(NAV_HISTORY_FILE, JSON.stringify(entry) + '\n');
  return entry;
}

/**
 * Read NAV history.
 * @returns {Array}
 */
function readNavHistory() {
  try {
    const lines = fs.readFileSync(NAV_HISTORY_FILE, 'utf8').trim().split('\n');
    return lines.filter(l => l).map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

module.exports = { loadState, saveState, updateStateAfterFill, appendNavHistory, readNavHistory, STATE_FILE, NAV_HISTORY_FILE };
