'use strict';

const { buildTradeEmailHtml, buildTradeEmailText } = require('../lib/tradeNotificationEmail');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log('=== lib/tradeNotificationEmail.js (Phase 1 redesign) ===\n');

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
    { symbol: 'VUSA', name: 'Vanguard S&P 500', quantityHeld: 18, valueChf: 1967.40, allocPct: 39.3, targetPct: 40, driftPct: -0.7 },
    { symbol: 'SLICHA', name: 'UBS ETF SLI', quantityHeld: 4, valueChf: 890.00, allocPct: 17.8, targetPct: 20, driftPct: -2.2 },
    { symbol: 'EMUAA', name: 'UBS MSCI EMU', quantityHeld: 6, valueChf: 1086.81, allocPct: 21.7, targetPct: 20, driftPct: 1.7 },
  ],
};

const openOrders = [
  { symbol: 'SLICHA', action: 'BUY', qty: 4, limitPrice: 222.50, currency: 'CHF', status: 'Submitted' },
];

console.log('-- buildTradeEmailHtml: with open orders --');
const html = buildTradeEmailHtml(trade, portfolio, openOrders);
assert(typeof html === 'string', 'Returns a string');
assert(html.includes('<html'), 'Contains HTML tag');
assert(html.includes('Fill summary'), 'Contains fill summary card');
assert(html.includes('Investor take'), 'Contains investor summary label');
assert(html.includes('Gross trade impact'), 'Contains CHF-first trade metric');
assert(html.includes('Portfolio after fill'), 'Contains portfolio-after-fill section');
assert(html.includes('Remaining open orders'), 'Contains open order section when orders exist');
assert(html.includes('VUSA'), 'Contains trade symbol');
assert(html.includes('Vanguard S&amp;P 500') || html.includes('Vanguard S&P 500'), 'Contains holding name');
assert(html.includes('SLICHA'), 'Contains open order symbol');
assert(html.includes('222.50') || html.includes('222.5'), 'Contains open order limit price');
assert(!html.includes('Execution detail'), 'Does NOT contain Execution detail (removed by Phase 1)');

console.log('\n-- buildTradeEmailHtml: no open orders --');
const htmlNoOrders = buildTradeEmailHtml(trade, portfolio, []);
assert(!htmlNoOrders.includes('Remaining open orders'), 'Does NOT contain open orders section when none exist');
assert(!htmlNoOrders.includes('No open orders'), 'Does NOT mention open orders at all when none exist');
assert(!htmlNoOrders.includes('no remaining open orders'), 'No filler open-order language');

console.log('\n-- buildTradeEmailHtml: purchase summary --');
assert(html.includes('Purchase summary'), 'Contains purchase summary card');
assert(html.includes('Quantity purchased'), 'Shows quantity purchased');
assert(html.includes('Price per unit'), 'Shows price per unit');
assert(html.includes('Total cost'), 'Shows total cost');
assert(html.includes('Resulting total held'), 'Shows resulting total held');

console.log('\n-- buildTradeEmailHtml: commission row suppressed when equal --');
const tradeNoFees = { ...trade, fees: 0, costChf: 1967.40 };
const htmlNoFees = buildTradeEmailHtml(tradeNoFees, portfolio, []);
assert(!htmlNoFees.includes('Cost in CHF including commission'), 'Hides commission row when same as total cost');

console.log('\n-- buildTradeEmailHtml: commission row shown when distinct --');
const tradeWithFees = { ...trade, fees: 4.50, costChf: 1967.40, actualChf: 1971.90 };
const htmlWithFees = buildTradeEmailHtml(tradeWithFees, portfolio, []);
assert(htmlWithFees.includes('Cost in CHF including commission') || htmlWithFees.includes('1,971.90') || htmlWithFees.includes('1971.90'), 'Shows commission-inclusive cost when distinct');

console.log('\n-- buildTradeEmailHtml: resulting total held populated --');
assert(html.includes('18'), 'Resulting total held shows actual quantity from holdings');

console.log('\n-- buildTradeEmailHtml: after-fill facts --');
assert(html.includes('After this fill'), 'Contains after-fill facts section');
assert(html.includes('Cash after this fill'), 'Shows post-fill cash in facts');

console.log('\n-- buildTradeEmailText --');
const text = buildTradeEmailText(trade, portfolio, openOrders);
assert(typeof text === 'string', 'Text version returns a string');
assert(text.includes('VUSA'), 'Text contains trade symbol');
assert(text.includes('fill confirmed'), 'Text contains fill confirmed header');
assert(text.includes('Purchase summary'), 'Text contains purchase summary');
assert(text.includes('Portfolio after fill'), 'Text contains portfolio after fill');
assert(text.includes('Remaining open orders'), 'Text mentions remaining open orders when present');
assert(!text.includes('Execution detail'), 'Text does NOT contain Execution detail');

console.log('\n-- buildTradeEmailText: no open orders --');
const textNoOrders = buildTradeEmailText(trade, portfolio, []);
assert(!textNoOrders.includes('Remaining open orders'), 'Text omits open orders when none');
assert(!textNoOrders.includes('no remaining open orders'), 'Text has no filler open-order language');

console.log('\n-- Edge cases --');
const minTrade = { symbol: 'X', action: 'BUY', qty: 1, price: 0, fillPrice: 0, fillQty: 0, currency: 'CHF', costChf: 0, fees: 0, orderId: '0', time: '' };
const minPortfolio = { name: 'Test', totalValueChf: 0, cashChf: 0, holdings: [] };
const htmlMin = buildTradeEmailHtml(minTrade, minPortfolio, []);
assert(typeof htmlMin === 'string' && htmlMin.length > 100, 'Handles minimal/zero values without crash');
const textMin = buildTradeEmailText(minTrade, minPortfolio, []);
assert(typeof textMin === 'string' && textMin.length > 50, 'Text handles minimal/zero values without crash');

console.log('\n-- Name enrichment: instrument name from portfolio holdings --');
const tradeNoName = { ...trade, name: undefined, instrument: undefined };
const htmlName = buildTradeEmailHtml(tradeNoName, portfolio, []);
assert(htmlName.includes('Vanguard S&amp;P 500') || htmlName.includes('Vanguard S&P 500'), 'Resolves name from holdings when trade has no name');
assert(!htmlName.includes('Name unavailable'), 'Does NOT show Name unavailable when enrichment works');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
