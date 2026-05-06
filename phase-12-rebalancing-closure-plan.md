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
- [ ] Inspect current rebalancing workflow for remaining closure gaps.
- [ ] Enforce min/max allocation breach handling in proposal generation.
- [ ] Tighten cash-drag checks in proposal generation.
- [ ] Avoid excessive turnover when proposals do not materially improve drift.
- [ ] Add focused tests for:
  - [ ] min/max allocation breach handling
  - [ ] cash-drag enforcement
  - [ ] excessive-turnover avoidance
- [ ] Run the targeted Phase 12 rebalancing test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader verification bundle(s) affected by this phase.
- [ ] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused rebalancing regression test(s)
- Existing rebalancing and execution verification scripts
