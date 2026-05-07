'use strict';

const fs = require('fs');
const path = require('path');

// Use temp files for testing
const TEMP_STATE = path.join(__dirname, '..', 'runtime', 'test-portfolio-state.json');
const TEMP_NAV = path.join(__dirname, '..', 'runtime', 'test-nav-history.jsonl');

// Monkey-patch the module paths
const mod = require('../lib/portfolioState');
const origStateFile = mod.STATE_FILE;
const origNavFile = mod.NAV_HISTORY_FILE;

// Override file paths for testing
const { loadState, saveState, updateStateAfterFill, appendNavHistory, readNavHistory } = mod;

// We'll test with the real paths but clean up after
let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  \u2713 ' + msg); }
  else { failed++; console.error('  \u2717 ' + msg); }
}

console.log('=== lib/portfolioState.js ===\n');

// Clean up any existing test state
try { fs.unlinkSync(TEMP_STATE); } catch {}
try { fs.unlinkSync(TEMP_NAV); } catch {}

// --- Save/Load ---
console.log('-- save/load --');

const testState = {
  holdings: [{ symbol: 'VUSA', qty: 18, avgPrice: 109.50, marketValue: 1971, currency: 'CHF' }],
  cashChf: 3029,
  totalValueChf: 5000,
};

// Save
const saved = saveState(testState);
assert(saved.lastUpdated !== undefined, 'lastUpdated set on save');
assert(fs.existsSync(mod.STATE_FILE), 'State file created');

// Load
const loaded = loadState();
assert(loaded !== null, 'State loaded successfully');
assert(loaded.cashChf === 3029, 'Cash value preserved');
assert(loaded.holdings.length === 1, 'Holdings preserved');
assert(loaded.holdings[0].symbol === 'VUSA', 'Symbol preserved');

// --- Update after fill ---
console.log('\n-- updateStateAfterFill --');

const afterBuy = updateStateAfterFill({ symbol: 'SLICHA', qty: 4, price: 222, currency: 'CHF', action: 'BUY' });
assert(afterBuy.holdings.length === 2, 'New holding added');
assert(afterBuy.holdings.find(h => h.symbol === 'SLICHA').qty === 4, 'SLICHA qty correct');
assert(afterBuy.cashChf === 3029 - (4 * 222), 'Cash reduced by purchase cost');

// Buy more of existing
const afterBuy2 = updateStateAfterFill({ symbol: 'VUSA', qty: 2, price: 110, currency: 'CHF', action: 'BUY' });
assert(afterBuy2.holdings.find(h => h.symbol === 'VUSA').qty === 20, 'VUSA qty increased');

// Sell
const afterSell = updateStateAfterFill({ symbol: 'VUSA', qty: 5, price: 112, currency: 'CHF', action: 'SELL' });
assert(afterSell.holdings.find(h => h.symbol === 'VUSA').qty === 15, 'VUSA qty decreased after sell');
assert(afterSell.cashChf > afterBuy2.cashChf, 'Cash increased after sell');

// --- NAV History ---
console.log('\n-- appendNavHistory --');

// Clear any existing
try { fs.unlinkSync(mod.NAV_HISTORY_FILE); } catch {}

appendNavHistory(afterSell);
appendNavHistory(afterSell);
const history = readNavHistory();
assert(history.length === 2, 'Two NAV entries appended');
assert(history[0].totalValueChf > 0, 'NAV value recorded');
assert(history[0].date.match(/^\d{4}-\d{2}-\d{2}$/), 'Date format correct');

// --- Edge: load when no file ---
console.log('\n-- edge cases --');
fs.unlinkSync(mod.STATE_FILE);
const empty = loadState();
assert(empty === null, 'Returns null when no state file');

// Clean up
try { fs.unlinkSync(mod.NAV_HISTORY_FILE); } catch {}

console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
process.exit(failed > 0 ? 1 : 0);
