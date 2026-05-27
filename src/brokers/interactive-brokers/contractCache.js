const fs = require('fs');
const path = require('path');
const { writeJsonIfChanged } = require('../../reporting/artifactWriter');

const CACHE_REL_PATH = 'runtime/contract-intelligence/cache.json';
const SCHEMA_VERSION = '1.0';

function cachePath(repoRoot) {
  return path.join(repoRoot, CACHE_REL_PATH);
}

function emptyCache() {
  return { schemaVersion: SCHEMA_VERSION, updatedAt: null, contracts: {} };
}

function loadContractCache(repoRoot) {
  const filePath = cachePath(repoRoot);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyCache();
    return {
      schemaVersion: parsed.schemaVersion || SCHEMA_VERSION,
      updatedAt: parsed.updatedAt || null,
      contracts: parsed.contracts && typeof parsed.contracts === 'object' ? parsed.contracts : {},
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') return emptyCache();
    throw error;
  }
}

function saveContractCache(repoRoot, cache, { now = () => new Date().toISOString() } = {}) {
  const filePath = cachePath(repoRoot);
  const payload = {
    schemaVersion: cache?.schemaVersion || SCHEMA_VERSION,
    updatedAt: now(),
    contracts: cache?.contracts && typeof cache.contracts === 'object' ? cache.contracts : {},
  };
  return writeJsonIfChanged(filePath, payload);
}

function normString(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.toUpperCase() : null;
}

function lookupCached(cache, { isin, symbol, conid } = {}) {
  if (!cache || !cache.contracts) return null;
  const entries = Object.values(cache.contracts);
  if (conid !== null && conid !== undefined && String(conid).trim() !== '') {
    const key = String(conid).trim();
    if (cache.contracts[key]) return cache.contracts[key];
    const hit = entries.find((entry) => String(entry?.conid ?? '') === key);
    if (hit) return hit;
  }
  const wantIsin = normString(isin);
  if (wantIsin) {
    const hit = entries.find((entry) => normString(entry?.isin) === wantIsin);
    if (hit) return hit;
  }
  const wantSymbol = normString(symbol);
  if (wantSymbol) {
    const hit = entries.find(
      (entry) => normString(entry?.symbol) === wantSymbol || normString(entry?.localSymbol) === wantSymbol,
    );
    if (hit) return hit;
  }
  return null;
}

function upsertCachedContract(cache, contract, { now = () => new Date().toISOString() } = {}) {
  if (!cache || typeof cache !== 'object') {
    throw new Error('upsertCachedContract: cache object required');
  }
  if (!cache.contracts || typeof cache.contracts !== 'object') {
    cache.contracts = {};
  }
  if (!contract || contract.conid === null || contract.conid === undefined) {
    throw new Error('upsertCachedContract: contract.conid is required');
  }
  const key = String(contract.conid).trim();
  if (!key) {
    throw new Error('upsertCachedContract: contract.conid must be non-empty');
  }
  const previous = cache.contracts[key] || {};
  cache.contracts[key] = {
    ...previous,
    ...contract,
    conid: contract.conid,
    cachedAt: now(),
  };
  return cache.contracts[key];
}

module.exports = {
  CACHE_REL_PATH,
  SCHEMA_VERSION,
  cachePath,
  loadContractCache,
  saveContractCache,
  lookupCached,
  upsertCachedContract,
};
