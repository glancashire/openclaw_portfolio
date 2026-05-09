'use strict';

/**
 * Test tradeExecutionNotifier with a mocked mailgun.
 * We monkey-patch the sendEmail function to capture calls.
 */

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log('=== lib/tradeExecutionNotifier.js ===\n');

// Mock mailgun
const mailgunModule = require('../lib/mailgun');
let emailCalls = [];
const originalSendEmail = mailgunModule.sendEmail;
mailgunModule.sendEmail = async (opts) => {
  emailCalls.push(opts);
  return { id: '<mock-id>', message: 'Queued.' };
};

const { notifyTradeFill } = require('../lib/tradeExecutionNotifier');

const trade = {
  symbol: 'EMUAA', action: 'BUY', qty: 27, price: 40.30,
  fillPrice: 40.25, fillQty: 27, currency: 'EUR',
  costChf: 1086.75, fees: 1.50, orderId: '12', time: '2026-05-08T09:03',
};
const portfolio = { name: 'ETF Portfolio', totalValueChf: 5000, cashChf: 2000, holdings: [] };
const openOrders = [{ symbol: 'VUSA', action: 'BUY', qty: 18, limitPrice: 109.50, currency: 'CHF', status: 'Submitted' }];

async function run() {
  // Test 1: successful send
  console.log('-- notifyTradeFill success --');
  emailCalls = [];
  const result = await notifyTradeFill({ trade, portfolio, openOrders });
  assert(emailCalls.length === 1, 'sendEmail called once');
  assert(emailCalls[0].subject.includes('EMUAA'), 'Subject contains symbol');
  assert(emailCalls[0].subject.includes('40.25'), 'Subject contains fill price');
  assert(emailCalls[0].subject.includes('BUY'), 'Subject contains action');
  assert(emailCalls[0].to === 'lancashire@swift.ch', 'Default recipient used');
  assert(emailCalls[0].html.includes('<html'), 'HTML body present');
  assert(result.id === '<mock-id>', 'Returns mailgun response');

  // Test 2: custom recipient
  console.log('\n-- custom recipient --');
  emailCalls = [];
  await notifyTradeFill({ trade, portfolio, openOrders, to: 'test@example.com' });
  assert(emailCalls[0].to === 'test@example.com', 'Custom recipient used');

  // Test 3: sendEmail failure is non-blocking
  console.log('\n-- sendEmail failure handling --');
  mailgunModule.sendEmail = async () => { throw new Error('Network error'); };
  let threw = false;
  try {
    await notifyTradeFill({ trade, portfolio, openOrders });
  } catch (e) {
    threw = true;
  }
  // The function should catch internally and not throw
  // Let's check the source to see if it catches
  assert(!threw, 'notifyTradeFill does not throw on sendEmail failure');

  // Restore
  mailgunModule.sendEmail = originalSendEmail;

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
