const assert = require('assert');
const { buildSearchContracts, isIsin } = require('../src/brokers/interactive-brokers/nativeClient');

function testIsinDetector() {
  assert.strictEqual(isIsin('IE00B44T3H88'), true);
  assert.strictEqual(isIsin('LU0950670850'), true);
  assert.strictEqual(isIsin('ie00b44t3h88'), true, 'lowercase normalized');
  assert.strictEqual(isIsin(' IE00B44T3H88 '), true, 'whitespace tolerated');
  assert.strictEqual(isIsin('VWRL'), false);
  assert.strictEqual(isIsin('1234567890AB'), false, 'first two must be letters');
  assert.strictEqual(isIsin(''), false);
  assert.strictEqual(isIsin(null), false);
}

function testIsinQueryProducesIsinAttempts() {
  const attempts = buildSearchContracts('IE00B44T3H88');
  assert.ok(Array.isArray(attempts) && attempts.length > 0, 'returns attempts');
  const isinAttempts = attempts.filter((c) => c.secIdType === 'ISIN' && c.secId === 'IE00B44T3H88');
  assert.ok(isinAttempts.length >= 2, `expected >=2 ISIN-keyed attempts, got ${isinAttempts.length}`);
  assert.strictEqual(attempts[0].secIdType, 'ISIN', 'ISIN attempt comes first');
  assert.strictEqual(attempts[0].secType, 'STK', 'secType STK on ISIN attempt');
  // Ensure symbol-style fallbacks still present
  const symbolAttempts = attempts.filter((c) => c.symbol && !c.secId);
  assert.ok(symbolAttempts.length > 0, 'symbol-style fallbacks still produced');
}

function testNonIsinQueryUnchanged() {
  const attempts = buildSearchContracts('VWRL');
  assert.ok(attempts.length > 0);
  const isinAttempts = attempts.filter((c) => c.secIdType === 'ISIN');
  assert.strictEqual(isinAttempts.length, 0, 'no ISIN attempts for symbol query');
  const first = attempts[0];
  assert.strictEqual(first.symbol, 'VWRL');
  assert.strictEqual(first.secType, 'STK');
  assert.strictEqual(first.exchange, 'SMART');
}

function testQueryUppercased() {
  const attempts = buildSearchContracts('ie00b44t3h88');
  assert.strictEqual(attempts[0].secIdType, 'ISIN');
  assert.strictEqual(attempts[0].secId, 'IE00B44T3H88', 'ISIN uppercased');
}

function main() {
  testIsinDetector();
  testIsinQueryProducesIsinAttempts();
  testNonIsinQueryUnchanged();
  testQueryUppercased();
  console.log('test-isin-search-contracts: OK');
}

main();
