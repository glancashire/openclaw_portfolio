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
const portfolio = { name: 'ETF Portfolio', totalValueChf: 5000, cashChf: 2000, holdings: [] };
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

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
