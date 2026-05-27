const path = require('path');
const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
const { searchEtfInstruments } = require('../src/brokers/interactive-brokers/instruments');
const { pickBestContractIntelligence } = require('../src/brokers/interactive-brokers/contractIntelligence');
const { isIsin } = require('../src/brokers/interactive-brokers/nativeClient');
const {
  loadContractCache,
  saveContractCache,
  upsertCachedContract,
  lookupCached,
} = require('../src/brokers/interactive-brokers/contractCache');

function describeBest(best) {
  if (!best) return null;
  return {
    conid: best.conid,
    symbol: best.symbol,
    name: best.name,
    localSymbol: best.localSymbol,
    primaryExch: best.primaryExch,
    exchange: best.exchange,
    currency: best.currency,
    isin: best.isin,
    venueKey: best.venueKey,
  };
}

async function main() {
  const portfolioPath = process.argv[2];
  if (!portfolioPath) {
    throw new Error('Usage: node scripts/resolve-interactive-brokers-conids.js <portfolio.md>');
  }

  const repoRoot = process.cwd();
  const allInstruments = readApprovedInstruments(portfolioPath);

  // Candidates: instruments without an ibkr_conid that have either a usable
  // symbol OR a ticker that looks like an ISIN.
  const candidates = allInstruments.filter((row) => {
    if (row.ibkrConid) return false;
    if (row.ibkrSymbol) return true;
    return isIsin(row.tickerOrIsin);
  });

  const cache = loadContractCache(repoRoot);
  const results = [];

  for (const instrument of candidates) {
    const isinQuery = isIsin(instrument.tickerOrIsin) ? instrument.tickerOrIsin.toUpperCase() : null;
    const symbolQuery = instrument.ibkrSymbol || null;
    const query = symbolQuery || isinQuery;
    const queryKind = symbolQuery ? 'symbol' : 'isin';

    // Cache hit shortcut.
    const cached = lookupCached(cache, {
      isin: isinQuery,
      symbol: symbolQuery,
      conid: instrument.ibkrConid,
    });
    if (cached) {
      results.push({
        tickerOrIsin: instrument.tickerOrIsin,
        name: instrument.name,
        query,
        queryKind,
        resolution: 'cache_hit',
        bestMatch: describeBest(cached),
      });
      continue;
    }

    let found;
    let triedQueries = [];
    try {
      triedQueries.push(query);
      found = await searchEtfInstruments({ query, portfolio: 'etf' });
      // If symbol search returned nothing useful and there's also an ISIN available,
      // retry with the ISIN form. The placeholder 'UK' / sentinel symbol case lives here.
      if (
        symbolQuery
        && isinQuery
        && (!found?.ok || !(found.instruments && found.instruments.length))
      ) {
        triedQueries.push(isinQuery);
        const fallback = await searchEtfInstruments({ query: isinQuery, portfolio: 'etf' });
        if (fallback?.ok && fallback.instruments && fallback.instruments.length) {
          found = fallback;
        }
      }
    } catch (error) {
      results.push({
        tickerOrIsin: instrument.tickerOrIsin,
        name: instrument.name,
        query,
        queryKind,
        resolution: 'error',
        error: error.message || String(error),
      });
      continue;
    }

    if (!found?.ok) {
      results.push({
        tickerOrIsin: instrument.tickerOrIsin,
        name: instrument.name,
        query,
        queryKind,
        resolution: found?.reason === 'auth_failed' ? 'auth_failed' : 'broker_error',
        reason: found?.reason || 'unknown',
        error: found?.error || null,
        count: 0,
      });
      continue;
    }

    const best = pickBestContractIntelligence(found.instruments, instrument);
    if (!best || best.conid === null || best.conid === undefined) {
      results.push({
        tickerOrIsin: instrument.tickerOrIsin,
        name: instrument.name,
        query,
        queryKind,
        resolution: 'no_match',
        count: found.count || 0,
      });
      continue;
    }

    upsertCachedContract(cache, {
      conid: best.conid,
      symbol: best.symbol,
      localSymbol: best.localSymbol,
      primaryExch: best.primaryExch,
      exchange: best.exchange,
      currency: best.currency,
      secType: best.secType,
      isin: best.isin || isinQuery,
      name: best.name,
      venueKey: best.venueKey,
      sourceQuery: query,
      sourceQueryKind: queryKind,
    });

    results.push({
      tickerOrIsin: instrument.tickerOrIsin,
      name: instrument.name,
      query,
      queryKind,
      resolution: 'resolved',
      count: found.count || 0,
      triedQueries,
      bestMatch: describeBest(best),
    });
  }

  let cacheWrite = { wrote: false, path: null };
  try {
    cacheWrite = saveContractCache(repoRoot, cache);
  } catch (error) {
    cacheWrite = { wrote: false, error: error.message || String(error) };
  }

  console.log(JSON.stringify({
    portfolioPath: path.relative(repoRoot, portfolioPath) || portfolioPath,
    candidateCount: candidates.length,
    cache: { wrote: cacheWrite.wrote, path: cacheWrite.path || null, error: cacheWrite.error || null },
    results,
  }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
