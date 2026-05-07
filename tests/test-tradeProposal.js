'use strict';

const { analyzeDrift } = require('../lib/portfolioDrift');
const { generateProposal } = require('../lib/tradeProposalGenerator');
const { formatProposalMarkdown } = require('../lib/tradeProposalFormatter');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log('  \u2713 ' + msg); }
  else { failed++; console.error('  \u2717 ' + msg); }
}

console.log('=== Trade Proposal Generator ===\n');

// --- Drift Analysis ---
console.log('-- analyzeDrift --');

const drift1 = analyzeDrift({
  totalValue: 5000,
  cashChf: 5000,
  positions: [],
});
assert(drift1.allocations.length === 4, 'Returns 4 allocations (3 ETFs + cash)');
assert(drift1.allocations.find(a => a.symbol === '_CASH').actualPct === 100, 'All cash = 100% cash allocation');
assert(drift1.needsRebalance.length === 3, 'All 3 ETFs need rebalancing when empty');

const drift2 = analyzeDrift({
  totalValue: 5000,
  cashChf: 1000,
  positions: [
    { symbol: 'VUSA', marketValue: 2000 },
    { symbol: 'SLICHA', marketValue: 1000 },
    { symbol: 'EMUAA', marketValue: 1000 },
  ],
});
assert(drift2.allocations.find(a => a.symbol === 'VUSA').actualPct === 40, 'VUSA at 40%');
assert(drift2.allocations.find(a => a.symbol === '_CASH').actualPct === 20, 'Cash at 20%');
assert(drift2.needsRebalance.length === 0, 'Balanced portfolio needs no rebalance');

// --- Proposal Generation ---
console.log('\n-- generateProposal --');

const prices = {
  VUSA: { price: 109.50, currency: 'CHF', exchange: 'EBS' },
  SLICHA: { price: 222.00, currency: 'CHF', exchange: 'EBS' },
  EMUAA: { price: 40.00, currency: 'EUR', exchange: 'EBS' },
};

// Empty portfolio - should generate buys
const prop1 = generateProposal({ drift: drift1, prices });
assert(prop1.trades.length > 0, 'Generates trades for empty portfolio');
assert(prop1.summary.reason === 'rebalance', 'Reason is rebalance');
assert(prop1.summary.cashReserveOk === true, 'Cash reserve maintained');
assert(prop1.trades.every(t => t.action === 'BUY'), 'All trades are BUY');
assert(prop1.trades.every(t => t.costChf >= 500), 'All trades meet minimum CHF 500');

// Balanced portfolio - no trades
const prop2 = generateProposal({ drift: drift2, prices });
assert(prop2.trades.length === 0, 'No trades for balanced portfolio');
assert(prop2.summary.reason === 'balanced', 'Reason is balanced');

// Low cash - skip
const driftLowCash = analyzeDrift({ totalValue: 1500, cashChf: 1200, positions: [{ symbol: 'VUSA', marketValue: 300 }] });
const prop3 = generateProposal({ drift: driftLowCash, prices, cashReserveChf: 1000 });
// deployable = 1200 - 1000 = 200, below min trade 500
assert(prop3.trades.length === 0, 'No trades when deployable below minimum');
assert(prop3.summary.reason === 'skip', 'Reason is skip');

// --- Proposal Formatter ---
console.log('\n-- formatProposalMarkdown --');

const md = formatProposalMarkdown({ trades: prop1.trades, summary: prop1.summary, drift: drift1, date: '2026-05-08' });
assert(md.includes('# Trade Proposal'), 'Contains title');
assert(md.includes('2026-05-08'), 'Contains date');
assert(md.includes('VUSA') || md.includes('SLICHA') || md.includes('EMUAA'), 'Contains instrument');
assert(md.includes('BUY'), 'Contains action');
assert(md.includes('Approval'), 'Contains approval section');

// No-trade format
const mdEmpty = formatProposalMarkdown({ trades: [], summary: prop2.summary, drift: drift2 });
assert(mdEmpty.includes('No Trades'), 'Shows no trades status');

console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===');
process.exit(failed > 0 ? 1 : 0);
