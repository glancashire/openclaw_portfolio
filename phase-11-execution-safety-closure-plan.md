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
- [ ] Inspect current execution/safety workflow for remaining closure gaps.
- [ ] Tighten fail-closed blocking for unmatched holdings.
- [ ] Tighten remaining risk-limit / execution-safety edge handling.
- [ ] Improve writable/staged execution durability and operator-facing diagnostics where needed.
- [ ] Add focused tests for:
  - [ ] unmatched holdings block execution safely
  - [ ] remaining risk-limit blockers surface clearly
  - [ ] writable/staged execution edge handling remains durable
- [ ] Run the targeted Phase 11 execution/safety test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader verification bundle(s) affected by this phase.
- [ ] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused execution/safety regression test(s)
- Existing execution lifecycle / safety / broker verification scripts
