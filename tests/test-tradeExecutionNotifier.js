'use strict';

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log('=== lib/tradeExecutionNotifier.js ===\n');

const { notifyTradeFill } = require('../lib/tradeExecutionNotifier');

const trade = {
  symbol: 'EMUAA', action: 'BUY', qty: 27, price: 40.30,
  fillPrice: 40.25, fillQty: 27, currency: 'EUR',
  costChf: 1086.75, fees: 1.50, orderId: '12', time: '2026-05-08T09:03',
};
const portfolio = { name: 'ETF Portfolio', totalValueChf: 5000, cashChf: 2000, holdings: [
  { symbol: 'EMUAA', name: 'UBS MSCI EMU', quantityHeld: 27, valueChf: 1086.75, allocPct: 21.7, targetPct: 20, driftPct: 1.7 },
  { symbol: 'VUSA', name: 'Vanguard S&P 500', quantityHeld: 18, valueChf: 1967.40, allocPct: 39.3, targetPct: 40, driftPct: -0.7 },
] };
const openOrders = [{ symbol: 'VUSA', action: 'BUY', qty: 18, limitPrice: 109.50, currency: 'CHF', status: 'Submitted' }];

async function run() {
  console.log('-- notifyTradeFill success --');
  const emailCalls = [];
  const result = await notifyTradeFill({
    trade,
    portfolio,
    openOrders,
    to: 'lancashire@swift.ch',
    sendEmailImpl: async (opts) => {
      emailCalls.push(opts);
      return { id: '<mock-id>', message: 'Queued.' };
    },
  });
  assert(emailCalls.length === 1, 'sendEmail called once');
  assert(emailCalls[0].subject.includes('EMUAA'), 'Subject contains symbol');
  assert(emailCalls[0].subject.includes('40.25'), 'Subject contains fill price');
  assert(emailCalls[0].subject.includes('BUY'), 'Subject contains action');
  assert(emailCalls[0].to === 'lancashire@swift.ch', 'Recipient used');
  assert(emailCalls[0].html.includes('<html'), 'HTML body present');
  assert(emailCalls[0].text.includes('Portfolio value: CHF 5000.00'), 'Text fallback includes CHF portfolio value');
  assert(result.result && result.result.id === '<mock-id>', 'Returns wrapped mail provider response');

  console.log('\n-- custom recipient --');
  const customCalls = [];
  await notifyTradeFill({
    trade,
    portfolio,
    openOrders,
    to: 'test@example.com',
    sendEmailImpl: async (opts) => {
      customCalls.push(opts);
      return { id: '<mock-id>', message: 'Queued.' };
    },
  });
  assert(customCalls[0].to === 'test@example.com', 'Custom recipient used');

  console.log('\n-- sendEmail failure handling --');
  let threw = false;
  let failureResult = null;
  try {
    failureResult = await notifyTradeFill({
      trade,
      portfolio,
      openOrders,
      to: 'lancashire@swift.ch',
      sendEmailImpl: async () => { throw new Error('Network error'); },
    });
  } catch (e) {
    threw = true;
  }
  assert(!threw, 'notifyTradeFill does not throw on sendEmail failure');
  assert(failureResult && failureResult.sent === false && /Network error/.test(failureResult.error || ''), 'Failure result is non-blocking and preserves the error');

  console.log('\n-- readiness gate: defers when portfolio holdings missing (no explicit to) --');
  const emptyPortfolio = { name: 'ETF Portfolio', totalValueChf: 5000, cashChf: 2000, holdings: [] };
  const deferCalls = [];
  const deferResult = await notifyTradeFill({
    trade,
    portfolio: emptyPortfolio,
    openOrders,
    sendEmailImpl: async (opts) => { deferCalls.push(opts); return { id: '<should-not-send>' }; },
    notificationMode: 'live_fill',
  });
  assert(deferCalls.length === 0, 'No email sent when not investor-ready');
  assert(deferResult.reason === 'not_investor_ready', 'Returns not_investor_ready reason');
  assert(Array.isArray(deferResult.missing), 'Returns missing fields array');
  assert(deferResult.missing.includes('portfolio_holdings'), 'Missing includes portfolio_holdings');

  console.log('\n-- readiness gate: explicit to bypasses readiness --');
  const explicitToCalls = [];
  const explicitToResult = await notifyTradeFill({
    trade,
    portfolio: emptyPortfolio,
    openOrders,
    to: 'test@example.com',
    sendEmailImpl: async (opts) => { explicitToCalls.push(opts); return { id: '<explicit-to>' }; },
    notificationMode: 'live_fill',
  });
  assert(explicitToCalls.length === 1, 'Explicit to sends despite low-trust portfolio');
  assert(explicitToResult.sent === true, 'Explicit to result is sent=true');

  console.log('\n-- readiness gate: backfill mode bypasses readiness --');
  const backfillCalls = [];
  const backfillResult = await notifyTradeFill({
    trade,
    portfolio: emptyPortfolio,
    openOrders,
    sendEmailImpl: async (opts) => { backfillCalls.push(opts); return { id: '<backfill-id>' }; },
    notificationMode: 'backfill',
  });
  assert(backfillCalls.length === 1, 'Backfill sends email even with empty portfolio');
  assert(backfillResult.sent === true, 'Backfill result indicates sent');
  assert(backfillCalls[0].subject.includes('[Backfill]'), 'Backfill subject has prefix');

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
