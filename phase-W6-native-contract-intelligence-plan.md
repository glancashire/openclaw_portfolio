# Phase W6 — Native Contract Intelligence Plan

## Goal
Add an ISIN-capable contract lookup path plus a persistent contract cache so readiness/calendar tools can reuse resolved contract identity. Attempt live resolution of the 4 sentinel ISINs and update `portfolio/etf/portfolio.md` accordingly.

## Sentinel ISINs (currently `ibkr_symbol=missing`, `ibkr_conid=missing`)
- `LU0950670850` — UBS MSCI United Kingdom UCITS ETF GBP acc (GBP)
- `IE00B44T3H88` — HSBC MSCI China UCITS ETF USD (USD)
- `IE00B5L8K969` — iShares MSCI EM Asia UCITS ETF Acc (USD)
- `IE00B4L5YX21` — iShares Core MSCI Japan IMI UCITS ETF (USD)

These are all 0% target "future candidate" sleeves, so resolution is opportunistic — failure to resolve is acceptable and must be documented in the portfolio Notes column.

## Deliverables

1. **Plan file (this document).** Commit before implementation.
2. **ISIN-aware search contract builder** (`src/brokers/interactive-brokers/nativeClient.js`)
   - Detect ISIN shape (`/^[A-Z]{2}[A-Z0-9]{10}$/`) inside `buildSearchContracts(query)`.
   - When ISIN: prepend `{ secType: 'STK', isin: query, exchange: 'SMART' }` and `{ secType: 'STK', isin: query }` attempts, then fall back to symbol-style attempts (still useful for raw search fallback).
   - Non-ISIN: behaviour unchanged.
   - Export `buildSearchContracts` for unit tests.
3. **Contract cache** (`src/brokers/interactive-brokers/contractCache.js`)
   - Schema: `{ schemaVersion: '1.0', updatedAt, contracts: { [conid]: { ...normalizedContract, cachedAt } } }`.
   - API: `loadContractCache(repoRoot)`, `saveContractCache(repoRoot, cache)`, `lookupCached(cache, { isin, symbol, conid })`, `upsertCachedContract(cache, contract)`.
   - File location: `runtime/contract-intelligence/cache.json` (already gitignored via `runtime/`).
   - Uses `writeJsonIfChanged` from `src/reporting/artifactWriter.js`.
4. **Resolve script extension** (`scripts/resolve-interactive-brokers-conids.js`)
   - Include instruments that have an ISIN but no symbol (sentinel rows) in the candidate set.
   - Use `instrument.tickerOrIsin` as ISIN query when `ibkrSymbol` is null but the ticker looks like an ISIN.
   - On success: upsert the picked best match into the cache and persist.
   - Emit one row per instrument with `resolution: 'resolved' | 'no_match' | 'auth_failed' | 'error'`.
5. **Live resolution attempt**
   - Run script against `portfolio/etf/portfolio.md`. If gateway is down or no matches, document the four ISINs as "Unresolvable via IBKR API (W6 attempt YYYY-MM-DD)" in their Notes column. Do not invent conids.
6. **Tests** (wire into `verifyRepoChecks`)
   - `scripts/test-contract-cache.js` — cache load/upsert/lookup/missing-file paths.
   - `scripts/test-isin-search-contracts.js` — ISIN detection prepends isin-based attempts; non-ISIN unchanged.
7. **Closeout**
   - `npm test` green.
   - Commit + push to master.
   - Print progress summary.

## Risks / Notes
- IBKR gateway may not be reachable from this host; the script must degrade gracefully and still produce a useful JSON report.
- Symbol-mode search via `searchEtfInstruments` currently uppercases the query — an ISIN will be uppercased (already uppercase), and the new builder will see the ISIN shape and produce ISIN-keyed contract attempts before any symbol-keyed ones.
- Cache file is ephemeral (runtime/) so it does not need to round-trip through git, but is reusable across script invocations within a host lifetime.
