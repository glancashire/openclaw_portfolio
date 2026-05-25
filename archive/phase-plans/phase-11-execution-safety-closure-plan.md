# Phase 11 — Execution and safety closure plan

## Goal
Close the highest-risk remaining execution gaps by tightening writable-path durability, unmatched-holdings/risk-limit blocking, and operator-controlled transition safety before the final end-to-end acceptance pass.

## Scope for this phase
- Inspect the remaining execution, validation, and operator-transition gaps against the roadmap.
- Tighten fail-closed blocking for unmatched holdings and remaining risk-limit edge cases.
- Improve writable/staged execution durability where operator-facing ambiguity remains.
- Add focused tests covering the newly closed execution/safety edges.
- Update progress docs when verified.

## Actionable checklist
- [x] Inspect current execution/safety workflow for remaining closure gaps.
- [x] Tighten fail-closed blocking for unmatched holdings.
- [x] Tighten remaining risk-limit / execution-safety edge handling.
- [x] Improve writable/staged execution durability and operator-facing diagnostics where needed.
- [x] Add focused tests for:
  - [x] unmatched holdings block execution safely
  - [x] remaining risk-limit blockers surface clearly
  - [x] writable/staged execution edge handling remains durable
- [x] Run the targeted Phase 11 execution/safety test set.
- [x] If any test fails, iterate until green.
- [x] Run the broader verification bundle(s) affected by this phase.
- [x] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused execution/safety regression test(s)
- Existing execution lifecycle / safety / broker verification scripts

## Verified outcomes
- Unmatched holdings now fail closed with explicit blocker detail instead of only a generic safety signal.
- Current holdings that already breach the configured max single ETF allocation now block further execution with a concrete message.
- The new safety checks remain backward compatible across both holdings-table layouts already used in the repo.
- Safe dry-run staging still passes after the stricter execution-safety closure.
