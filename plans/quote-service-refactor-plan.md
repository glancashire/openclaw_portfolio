# Quote Access Service Refactor Plan

## Goal
Create a service-based modular quote access layer that can switch provider paths in the background without requiring calling-code changes, using ordered fallback:
1. IBKR Web API / Client Portal style path
2. IBKR TWS/native socket path
3. Free quote fallback service

The dashboard must surface quote provenance and age.

## Constraints
- Preserve existing portfolio-manager safety posture.
- Keep broker writes separate from quote reads.
- Avoid broad repo churn; start by routing reporting/valuation through the new service.
- Keep current behavior safe under degraded broker conditions.
- Prefer additive refactor over replacing working trading code.

## Design

### New service module
Add `src/quotes/quoteService.js` that:
- exposes a stable `resolveQuote(...)` / `resolveQuotes(...)` API
- attempts providers in configured priority order
- returns normalized quote payloads with:
  - `ok`
  - `price`, `bid`, `ask`, `last`, `close`
  - `currency`
  - `providerPath` (`ibkr_web_api`, `ibkr_tws`, `yahoo_last_close`, etc.)
  - `providerLabel`
  - `quality` (`live_or_realtime`, `last_close`, `stale_or_unknown`)
  - `asOf`
  - `ageSeconds`
  - `ageLabel`
  - `note`
  - `attempts[]`

### Provider adapters
Add `src/quotes/providers/`:
- `ibkrWebApiProvider.js`
- `ibkrTwsProvider.js`
- `yahooProvider.js`

These wrap current code rather than duplicating logic.

### Initial routing scope
Refactor quote resolution/reporting paths first:
- `src/reporting/quoteResolution.js`
- `src/analysis/brokerBackedPricing.js`
- dashboard/summary artifact rendering

### Dashboard changes
Add quote source/age visibility:
- holdings table note/summary line showing provider mix
- explicit per-row quote source + age in profit/loss or holdings-adjacent surface
- top-level dashboard summary like:
  - `Quote coverage: 12 ibkr_tws live, 3 ibkr_web_api delayed, 1 yahoo last close`
  - `Oldest quote age: ...`

## Implementation steps
1. Create quote service + provider adapters.
2. Migrate reporting quote resolution to service.
3. Migrate broker-backed pricing sizing path to service.
4. Add dashboard provenance/age summaries.
5. Add tests for provider fallback and dashboard surfacing.
6. Run focused tests.

## Verification
- unit-style script tests for fallback order
- quote-resolution regression tests
- dashboard generation regression tests
- direct inspection of generated dashboard markdown
