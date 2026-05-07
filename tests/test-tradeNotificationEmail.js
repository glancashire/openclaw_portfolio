'use strict';

const { buildTradeEmailHtml } = require('../lib/tradeNotificationEmail');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log('=== lib/tradeNotificationEmail.js ===\n');

const trade = {
  symbol: 'VUSA',
  action: 'BUY',
  qty: 18,
  price: 109.50,
  fillPrice: 109.30,
  fillQty: 18,
  currency: 'CHF',
  costChf: 1967.40,
  fees: 1.50,
  orderId: '40',
  time: '2026-05-08T09:05',
};

const portfolio = {
  name: 'ETF Portfolio',
  totalValueChf: 5000,
  cashChf: 1032.60,
  holdings: [
    { symbol: 'VUSA', name: 'Vanguard S&P 500', valueChf: 1967.40, allocPct: 39.3, targetPct: 40, driftPct: -0.7 },
    { symbol: 'SLICHA', name: 'UBS ETF SLI', valueChf: 890.00, allocPct: 17.8, targetPct: 20, driftPct: -2.2 },
    { symbol: 'EMUAA', name: 'UBS MSCI EMU', valueChf: 1086.81, allocPct: 21.7, targetPct: 20, driftPct: 1.7 },
  ],
};

const openOrders = [
  { symbol: 'SLICHA', action: 'BUY', qty: 4, limitPrice: 222.50, currency: 'CHF', status: 'Submitted' },
];

// --- Basic HTML generation ---
console.log('-- buildTradeEmailHtml --');

const html = buildTradeEmailHtml(trade, portfolio, openOrders);
assert(typeof html === 'string', 'Returns a string');
assert(html.includes('<html'), 'Contains HTML tag');
assert(html.includes('VUSA'), 'Contains trade symbol');
assert(html.includes('18'), 'Contains quantity');
assert(html.includes('109.30') || html.includes('109.3'), 'Contains fill price');
assert(html.includes('BUY'), 'Contains action');
assert(html.includes('CHF'), 'Contains currency');
assert(html.includes('ETF Portfolio'), 'Contains portfolio name');
assert(html.includes('Vanguard S&P 500'), 'Contains holding name');
assert(html.includes('SLICHA'), 'Contains open order symbol');
assert(html.includes('222.50') || html.includes('222.5'), 'Contains open order limit price');

// --- Empty open orders ---
console.log('\n-- Empty open orders --');
const htmlNoOrders = buildTradeEmailHtml(trade, portfolio, []);
assert(htmlNoOrders.includes('No open orders') || htmlNoOrders.includes('no open') || !htmlNoOrders.includes('Submitted'), 'Handles empty open orders');

// --- Missing/edge values ---
console.log('\n-- Edge cases --');
const minTrade = { symbol: 'X', action: 'BUY', qty: 1, price: 0, fillPrice: 0, fillQty: 0, currency: 'CHF', costChf: 0, fees: 0, orderId: '0', time: '' };
const minPortfolio = { name: 'Test', totalValueChf: 0, cashChf: 0, holdings: [] };
const htmlMin = buildTradeEmailHtml(minTrade, minPortfolio, []);
assert(typeof htmlMin === 'string' && htmlMin.length > 100, 'Handles minimal/zero values without crash');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
