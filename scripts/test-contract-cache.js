const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const {
  loadContractCache,
  saveContractCache,
  lookupCached,
  upsertCachedContract,
  cachePath,
  SCHEMA_VERSION,
} = require('../src/brokers/interactive-brokers/contractCache');

function withTempRoot(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'contract-cache-'));
  try {
    fn(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testLoadMissingFile() {
  withTempRoot((root) => {
    const cache = loadContractCache(root);
    assert.strictEqual(cache.schemaVersion, SCHEMA_VERSION, 'schema version applied');
    assert.deepStrictEqual(cache.contracts, {}, 'no contracts in fresh cache');
    assert.strictEqual(cache.updatedAt, null, 'updatedAt null on fresh cache');
  });
}

function testUpsertAddsEntry() {
  const cache = { schemaVersion: SCHEMA_VERSION, updatedAt: null, contracts: {} };
  const entry = upsertCachedContract(cache, {
    conid: 12345,
    symbol: 'VWRL',
    isin: 'IE00B3RBWM25',
    primaryExch: 'AEB',
    currency: 'EUR',
  }, { now: () => '2026-05-27T00:00:00Z' });
  assert.strictEqual(entry.symbol, 'VWRL');
  assert.strictEqual(entry.cachedAt, '2026-05-27T00:00:00Z');
  assert.ok(cache.contracts['12345'], 'entry stored under stringified conid');
}

function testUpsertUpdatesExisting() {
  const cache = { schemaVersion: SCHEMA_VERSION, updatedAt: null, contracts: {} };
  upsertCachedContract(cache, { conid: 42, symbol: 'OLD', currency: 'USD' }, { now: () => '2026-01-01T00:00:00Z' });
  upsertCachedContract(cache, { conid: 42, symbol: 'NEW', exchange: 'SMART' }, { now: () => '2026-02-01T00:00:00Z' });
  const entry = cache.contracts['42'];
  assert.strictEqual(entry.symbol, 'NEW', 'symbol updated');
  assert.strictEqual(entry.currency, 'USD', 'previous fields preserved');
  assert.strictEqual(entry.exchange, 'SMART', 'new fields applied');
  assert.strictEqual(entry.cachedAt, '2026-02-01T00:00:00Z', 'cachedAt refreshed');
}

function testLookupByIsinSymbolConid() {
  const cache = { schemaVersion: SCHEMA_VERSION, updatedAt: null, contracts: {} };
  upsertCachedContract(cache, {
    conid: 999,
    symbol: 'EIMI',
    localSymbol: 'EIMI',
    isin: 'IE00BKM4GZ66',
  });
  assert.ok(lookupCached(cache, { conid: 999 }), 'lookup by conid');
  assert.ok(lookupCached(cache, { conid: '999' }), 'lookup by string conid');
  assert.ok(lookupCached(cache, { isin: 'IE00BKM4GZ66' }), 'lookup by isin');
  assert.ok(lookupCached(cache, { isin: 'ie00bkm4gz66' }), 'lookup by lowercase isin');
  assert.ok(lookupCached(cache, { symbol: 'EIMI' }), 'lookup by symbol');
  assert.strictEqual(lookupCached(cache, { isin: 'AA0000000000' }), null, 'unknown isin returns null');
  assert.strictEqual(lookupCached(cache, {}), null, 'empty query returns null');
}

function testSaveAndReload() {
  withTempRoot((root) => {
    const cache = { schemaVersion: SCHEMA_VERSION, updatedAt: null, contracts: {} };
    upsertCachedContract(cache, { conid: 7, symbol: 'X', isin: 'US0000000007' });
    const result = saveContractCache(root, cache, { now: () => '2026-05-27T12:00:00Z' });
    assert.strictEqual(result.wrote, true, 'wrote on first save');
    assert.ok(fs.existsSync(cachePath(root)), 'cache file exists');
    const reloaded = loadContractCache(root);
    assert.strictEqual(reloaded.updatedAt, '2026-05-27T12:00:00Z');
    assert.ok(reloaded.contracts['7'], 'contract round-trips');
    const result2 = saveContractCache(root, cache, { now: () => '2026-05-27T12:00:00Z' });
    assert.strictEqual(result2.wrote, false, 'no write when unchanged');
  });
}

function main() {
  testLoadMissingFile();
  testUpsertAddsEntry();
  testUpsertUpdatesExisting();
  testLookupByIsinSymbolConid();
  testSaveAndReload();
  console.log('test-contract-cache: OK');
}

main();
