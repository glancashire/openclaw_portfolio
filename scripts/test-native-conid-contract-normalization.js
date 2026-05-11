const assert = require('assert');
const { buildConidContract } = require('../src/brokers/interactive-brokers/nativeClient');

function main() {
  const contract = buildConidContract('150029461', {
    exchange: 'SMART',
    secType: 'STK',
    currency: 'CHF',
    primaryExch: 'EBS',
    includePrimaryExch: true,
    symbol: 'UBSSLI',
    includeSymbol: true,
  });

  assert.strictEqual(contract.conId, 150029461, 'expected numeric conId');
  assert.strictEqual(contract.exchange, 'SMART', 'expected SMART exchange preserved');
  assert.strictEqual(contract.secType, 'STK', 'expected secType preserved');
  assert.strictEqual(contract.currency, 'CHF', 'expected currency preserved');
  assert.strictEqual(contract.primaryExch, 'EBS', 'expected primaryExch included when requested');
  assert.strictEqual(contract.symbol, 'UBSSLI', 'expected symbol included when requested');

  const minimal = buildConidContract('243939970', { exchange: 'SMART', secType: 'STK' });
  assert.strictEqual(minimal.primaryExch, undefined, 'expected primaryExch omitted by default');
  assert.strictEqual(minimal.symbol, undefined, 'expected symbol omitted by default');

  console.log(JSON.stringify({ ok: true, contract, minimal }, null, 2));
}

main();
