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
- [ ] Inspect current proposal engine inputs, allocation analysis, and rebalancing policy parsing gaps.
- [ ] Add shared parsing helpers for rebalancing threshold / avoid-unnecessary-trades / prefer-cash-first policy fields.
- [ ] Implement threshold-aware underweight proposal filtering.
- [ ] Implement cash-first behavior that avoids suggesting sells when available cash can cover eligible underweights.
- [ ] Implement suppression or blocking metadata for tiny churn / below-minimum proposals.
- [ ] Strengthen rationale / notes returned by `proposeTrades`.
- [ ] Add focused tests for:
  - [ ] drift below threshold produces no proposal
  - [ ] drift above threshold produces proposal
  - [ ] available cash prevents unnecessary sell recommendations
  - [ ] below-minimum proposal rows are suppressed or clearly blocked
  - [ ] notes/rationale explain the governing rule
- [ ] Run the targeted rebalancing test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader verification bundle(s) affected by this phase.
- [ ] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused `scripts/test-rebalancing-hardening.js`
- Existing proposal/execution safety scripts impacted by proposal generation
