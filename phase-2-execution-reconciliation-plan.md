# Phase 2 — execution reconciliation completion plan

## Goal
Close the remaining lifecycle gap between staged broker orders and durable terminal reconciliation so Markdown state, history, dashboard, and runtime error posture stay consistent across submit / fill / cancel / not-found / failure paths.

## Scope for this phase
- Tighten writable-path runtime error handling for cancel failures and successful recovery.
- Verify terminal reconciliation behavior for submitted, partially filled, filled, cancelled, and not-found outcomes.
- Verify resync keeps only actionable/latest open broker rows.
- Verify history/dashboard side effects remain triggered on material execution events.
- Update the roadmap/checklists to reflect verified phase completion.

## Actionable checklist
- [ ] Read current execution/runtime/broker-state implementation and identify the smallest missing consistency gap.
- [ ] Patch execution code if cancel-path runtime error handling is incomplete.
- [ ] Add or tighten focused automated tests for:
  - [ ] cancel failure increments broker runtime error state
  - [ ] successful cancel clears broker runtime error state
  - [ ] not-found reconciliation remains terminal and non-duplicative
  - [ ] writable handoff submit -> fill remains durable
- [ ] Run the targeted execution test bundle.
- [ ] If any test fails, iterate on code/tests until green.
- [ ] Run the broader execution verification bundle.
- [ ] Update roadmap/progress docs to mark this phase complete with evidence.
- [ ] Commit the phase.
- [ ] Push the phase.

## Verification gate
This phase is only complete when:
1. All targeted execution reconciliation tests pass.
2. `node scripts/verify-execution-surface.js` passes.
3. The updated docs reflect the verified state.

## Expected follow-on
Once this phase is green, move directly to the next highest-value unfinished phase: trade blocking and safety hardening.