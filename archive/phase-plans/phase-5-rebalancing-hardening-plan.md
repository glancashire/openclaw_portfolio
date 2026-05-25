# Phase 5 — Rebalancing hardening plan

## Goal
Make trade proposal generation more trustworthy by honoring configured rebalance thresholds and minimum trade discipline, preferring cash deployment before sells when feasible, and suppressing low-value churn so proposals better match the documented ETF-first operating rules.

## Scope for this phase
- Parse rebalancing policy controls from `portfolio.md` instead of relying on fixed heuristics.
- Enforce rebalance thresholds so minor drift does not generate proposals.
- Preserve cash-first proposal behavior when underweights can be improved without forced sells.
- Suppress tiny / noisy proposal rows and make blocking reasons explicit.
- Improve proposal rationale/notes so operators can see why each row exists or was skipped.
- Add focused tests for each new proposal-quality rule.
- Update progress docs when verified.

## Actionable checklist
- [x] Inspect current proposal engine inputs, allocation analysis, and rebalancing policy parsing gaps.
- [x] Add shared parsing helpers for rebalancing threshold / avoid-unnecessary-trades / prefer-cash-first policy fields.
- [x] Implement threshold-aware underweight proposal filtering.
- [x] Implement cash-first behavior that avoids suggesting sells when available cash can cover eligible underweights.
- [x] Implement suppression or blocking metadata for tiny churn / below-minimum proposals.
- [x] Strengthen rationale / notes returned by `proposeTrades`.
- [x] Add focused tests for:
  - [x] drift below threshold produces no proposal
  - [x] drift above threshold produces proposal
  - [x] available cash prevents unnecessary sell recommendations
  - [x] below-minimum proposal rows are suppressed or clearly blocked
  - [x] notes/rationale explain the governing rule
- [x] Run the targeted rebalancing test set.
- [x] If any test fails, iterate until green.
- [x] Run the broader verification bundle(s) affected by this phase.
- [x] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused `scripts/test-rebalancing-hardening.js`
- Existing proposal/execution safety scripts impacted by proposal generation

## Verified outcomes
- Trade proposals now parse and honor configured rebalance thresholds from `portfolio.md`.
- Cash-first proposal behavior is explicit in returned rationale and notes.
- Below-minimum proposal rows remain visible but are clearly blocked with exact reasons.
- Proposal generation now avoids emitting churn for underweights that stay inside the configured threshold.
