# Phase 12 — Rebalancing closure plan

## Goal
Finish the remaining rebalancing-policy gaps so trade proposals respect min/max allocation breaches, cash-drag expectations, and excessive-turnover avoidance before the final operator and end-to-end closure passes.

## Scope for this phase
- Inspect the remaining open rebalancing gaps in proposal generation and roadmap docs.
- Tighten proposal logic for min/max allocation breach handling.
- Tighten cash-drag enforcement when deployable cash remains materially above policy after proposed trades.
- Avoid excessive turnover when trades do not materially improve policy alignment.
- Add focused tests for each newly closed rebalancing rule.
- Update progress docs when verified.

## Actionable checklist
- [x] Inspect current rebalancing workflow for remaining closure gaps.
- [x] Enforce min/max allocation breach handling in proposal generation.
- [x] Tighten cash-drag checks in proposal generation.
- [x] Avoid excessive turnover when proposals do not materially improve drift.
- [x] Add focused tests for:
  - [x] min/max allocation breach handling
  - [x] cash-drag enforcement
  - [x] excessive-turnover avoidance
- [x] Run the targeted Phase 12 rebalancing test set.
- [x] If any test fails, iterate until green.
- [x] Run the broader verification bundle(s) affected by this phase.
- [x] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused rebalancing regression test(s)
- Existing rebalancing and execution verification scripts

## Verified outcomes
- Underweight sleeves outside configured min/max bounds now remain actionable even when threshold-only logic would have skipped them.
- Proposals that still leave portfolio cash drag above policy now surface explicit blocked reasons.
- Tiny churn proposals can now be suppressed as avoidable turnover while still retaining materially useful rebalance moves.
- Existing threshold, minimum-trade-size, and cash-first rebalancing behavior remains covered and green.
