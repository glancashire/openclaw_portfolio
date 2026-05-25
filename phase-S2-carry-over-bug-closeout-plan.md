# Phase S2 — Carry-over bug closeout

**Goal:** Close out the remaining order-management correctness gaps and harden the diagnostic surface so the same class of bugs (cross-client visibility, scripts/diagnostics path bugs, stale circuit breakers) can't quietly re-occur.

## Objectives
1. `scripts/cancel-portfolio-order.js` works for orders that exist at broker but aren't in our local trades.md (the order-102 case)
2. Approved instruments with missing IBKR conids are either resolved or explicitly excluded from market-calendar/readiness machinery so they stop generating noise
3. `scripts/diagnostics/` scripts can't ship the wrong relative require path again
4. Stale circuit breakers don't linger silently
5. All `verifyRepoChecks` tests still pass; new regression tests for each fix

## Risks / dependencies
- Touching `cancelPortfolioOrder` is execution-critical. We need extra test coverage and a careful read of the existing call sites. Mitigation: keep the existing local-trades path as primary; add a broker-only fallback that requires explicit operator opt-in.
- Resolving conids for the 4 unmapped instruments requires a broker round-trip and might surface listing-side issues (e.g., instrument delisted). Mitigation: if resolution fails, document the instrument as "no broker mapping available — excluded from automation".
- The SPMCHA circuit breaker is the only active one. Clearing it without understanding the proposer behavior could cause a tomorrow-morning misfire. Mitigation: read the proposer code path, confirm the new holiday detection prevents quote-quality `tier=unknown` from being treated as actionable, then clear with a recorded reason.

## Actionable checklist

### Sub-phase A — cancel-portfolio-order broker-fallback
- [ ] Read `src/execution/portfolioExecution.js::cancelPortfolioOrder` and trace the "no open trade found" branch
- [ ] Add a `--broker-only` (or `selector.brokerOnly=true`) path that:
  - looks up the order at the broker via `reqAllOpenOrders`
  - if found, calls `cancelOrder` (using clientId=0 if specified) and waits for the `Cancelled` event
  - records a synthetic log entry in `runtime/execution-state.json` so the cancel is auditable
- [ ] New test: `scripts/test-cancel-order-broker-only-fallback.js` mocks broker open-orders and verifies the path works
- [ ] Wire test into verifyRepoChecks

### Sub-phase B — diagnostics require-path guard
- [ ] Add `scripts/test-diagnostics-require-paths.js` that recursively requires every `scripts/diagnostics/*.js` module file with a stubbed entry point (or just resolves its imports) and asserts none throw `MODULE_NOT_FOUND`
- [ ] Wire into verifyRepoChecks
- [ ] Confirm both `list-ibkr-open-orders.js`, `cancel-broker-order.js`, `probe-delayed-and-tick.js`, `probe-market-data-subscriptions.js` pass

### Sub-phase C — conid resolution for unmapped instruments
- [ ] Identify the 4 ISINs (LU0950670850, IE00B44T3H88, IE00B5L8K969, IE00B4L5YX21) in portfolio.md
- [ ] Attempt resolution via `node scripts/resolve-interactive-brokers-conids.js portfolio/etf/portfolio.md` and capture results
- [ ] For each that resolves: update portfolio.md (Approved Instruments table) with `ibkr_conid` / `ibkr_symbol` / `ibkr_primary_exchange`
- [ ] For each that doesn't: add a note in the Notes column and add the ISIN to a documented exclude list
- [ ] Re-run `node scripts/sync-market-calendar.js portfolio/etf --json` and confirm zero `ibkr_error` syncStatus entries

### Sub-phase D — circuit breaker hygiene
- [ ] Read `runtime/circuit-breakers/etf/CH0130595124.json` and understand current state
- [ ] Verify the basket-proposer consumes `todayStatus` from market-calendar before generating quote-required legs (so we don't redo the Whit Monday accident on a real holiday)
- [ ] If the verification passes: clear the breaker with reason="root cause was holiday + insufficient settled cash; both addressed by market-calendar.todayStatus and current cash position CHF 29,381"
- [ ] If the verification fails: file a Phase S2.5 follow-up and leave the breaker tripped
- [ ] Add a guard test that confirms basket-proposer skips legs when `todayStatus == 'closed_holiday'`

## Acceptance criteria
- All 4 sub-phases complete OR explicitly deferred with a written reason
- `npm test` green (now ≥28 checks)
- New regression tests pass:
  - cancel-order broker-only fallback
  - diagnostics require-paths
  - basket-proposer holiday guard
- Either the SPMCHA breaker is cleared with a logged reason, or a Phase S2.5 plan exists
- All commits pushed to master

## Test strategy
- Unit tests for the new broker-only cancel path (mock broker client)
- Integration: re-run the actual `node scripts/diagnostics/list-ibkr-open-orders.js` against the live (logged-in) gateway as final smoke test
- Regression: the diagnostics-require-paths test prevents future path bugs

## Out
A repo where executable surfaces (order cancel, diagnostics, basket-proposer) can't silently misbehave; conid mapping complete or explicitly limited.
