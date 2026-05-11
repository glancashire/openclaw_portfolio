# Phase 127 — Smart-Limit Reference-Price Resilience

## Goal
Make market-open smart-limit generation resilient to partial IBKR quote payloads so live-ready approved rows do not fail unnecessarily when one preferred reference field is missing.

## Why this phase exists
After Phase 126, the truth surfaces now clearly show that market-open dry-run can still produce zero orders even while broker readiness is healthy. The current blocker is reference-price derivation: UBSSLI failed with `limit_price_unavailable`, which means the smart-limit path is too brittle for real broker quote payloads.

## Scope
- Trace how `fetchLatestPrice()` and market-open policy derive usable reference prices.
- Inspect current raw quote behavior for the remaining executable candidate(s).
- Relax or improve fallback logic for smart-limit/trend analysis without weakening safety constraints.
- Keep blocked reasons explicit if a quote is still unusable.
- Verify dry-run order preparation succeeds when a usable broker reference price exists.

## Non-goals
- Do not bypass trend guards or ETF quality checks.
- Do not silently submit live orders.
- Do not widen broker entitlements or spoof prices.

## Actionable checklist
- [ ] Inspect `fetchLatestPrice()` and `marketOpenPolicy` reference-price logic.
- [ ] Capture current broker quote shape for the failing instrument(s).
- [ ] Identify safe fallback precedence for bid/ask/last/close-derived limit construction.
- [ ] Implement the smallest safe fix.
- [ ] Add focused regression tests for partial-quote handling.
- [ ] Run dry-run + authority + preflight verification gates.
- [ ] Iterate until all targeted checks pass.
- [ ] Commit Phase 127 plan + implementation.
- [ ] Push Phase 127.

## Verification gates
- focused smart-limit / market-open policy regression tests
- `node scripts/submit-orders-at-open.js portfolio/etf --dry-run`
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js authority portfolio/etf --json`
- `node tests/test-ibkr-readiness.js`

## Exit criteria
- Smart-limit generation tolerates realistic partial quote payloads.
- Dry-run prepares at least the rows supported by currently usable broker quotes.
- Remaining blocked rows, if any, still report explicit auditable reasons.
