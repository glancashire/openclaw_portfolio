const assert = require('assert');
const { normaliseHolding } = require('../src/brokers/interactive-brokers/types');
const { enrichPositionsWithMarketSnapshot, preferredSnapshotPrice, snapshotPriceSource, extractCashChf } = require('../src/brokers/interactive-brokers/holdingsSync');

const fxHelper = normaliseHolding({
  contract: { conId: 12087817, symbol: 'EUR.CHF', localSymbol: 'EUR.CHF', currency: 'CHF' },
  position: 0,
  avgCost: 0,
});
assert.strictEqual(fxHelper.quantity, 0);
assert.strictEqual(fxHelper.ticker, 'EUR.CHF');

const nativePosition = normaliseHolding({
  contract: { conId: 243939970, symbol: 'EMUAA', localSymbol: 'EMUAA', currency: 'EUR' },
  position: 49,
  avgCost: 39.8108,
});
assert.strictEqual(nativePosition.price, 39.8108, 'expected avgCost fallback price');
assert.strictEqual(nativePosition.priceBasis, 'avg_cost_fallback');
assert.strictEqual(Number(nativePosition.marketValue.toFixed(4)), Number((49 * 39.8108).toFixed(4)), 'expected avgCost-derived market value');

const marketPosition = normaliseHolding({
  contract: { conId: 75776072, symbol: 'SXR8', localSymbol: 'SXR8', currency: 'EUR' },
  position: 2,
  avgCost: 688.68,
  mktPrice: 686.98,
  mktValue: 1373.96,
});
assert.strictEqual(marketPosition.price, 686.98, 'expected market snapshot price to win over avgCost');
assert.strictEqual(marketPosition.priceBasis, 'market_snapshot');
assert.strictEqual(marketPosition.marketValue, 1373.96);
assert.strictEqual(marketPosition.marketValueBasis, 'broker_market_value');

assert.strictEqual(preferredSnapshotPrice({ '31': 686.98, '84': 686.88, '86': 686.96 }), 686.98);
assert.strictEqual(snapshotPriceSource({ '31': 686.98, '84': 686.88, '86': 686.96 }), 'last');
assert.strictEqual(preferredSnapshotPrice({ '84': 10, '86': 12 }), 11);
assert.strictEqual(snapshotPriceSource({ '84': 10, '86': 12 }), 'mid');

const cash = extractCashChf([
  { tag: 'AvailableFunds', value: '21365.27', currency: 'CHF' },
  { tag: 'SettledCash', value: '1365.27', currency: 'CHF' },
  { tag: 'CashBalance', value: '1365.27', currency: 'CHF' },
  { tag: 'TotalCashValue', value: '21365.27', currency: 'CHF' },
]);
assert.strictEqual(cash.value, 1365.27, 'expected conservative cash basis to prefer CashBalance');
assert.strictEqual(cash.basis, 'CashBalance');

(async () => {
  const positions = [{ contract: { conId: 75776072, symbol: 'SXR8', currency: 'EUR' }, position: 2, avgCost: 688.68 }];
  const enriched = await enrichPositionsWithMarketSnapshot({
    fetchMarketSnapshot: async () => ([{ conid: '75776072', '31': 686.98, '84': 686.88, '86': 686.96 }]),
  }, positions);
  assert.strictEqual(enriched[0].mktPrice, 686.98);
  assert.strictEqual(enriched[0].mktValue, 1373.96);
  assert.strictEqual(enriched[0].marketPriceSource, 'last');
  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
