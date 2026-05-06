# Phase 4 — operator actions and state transitions plan

Source checklist: `consolidated-roadmap-checklist.md`

## Goal
Make human-controlled execution paths predictable and safe by completing the proposal -> approval -> submission transition rules, tightening `trades.md` operator-action auditability, and proving the approve / reject / cancel / resync surfaces behave consistently.

## Scope for this phase
- Complete the remaining roadmap Phase 4 operator-transition work.
- Keep the writable/live safety posture unchanged: no hidden bypasses, no fake broker fills.
- Tighten `trades.md` update rules so operator actions leave clear, durable evidence.
- Verify the operator CLI surfaces align with the transition model.
- Add focused regression tests for any newly-closed gaps.
- Update roadmap/progress docs when verified.

## Current known progress
Already landed in recent commits:
- duplicate submission guard
- approval transition guard for invalid states
- stale proposal-era approval guard
- staged-order exclusion from proposal transition flows
- reject-before-submission guard
- cancel fallback by broker order id
- resync latest-row and idempotent open-order filtering hardening

## Remaining closure targets
1. make proposal -> approval -> submission transitions auditable as explicit operator actions
2. define/enforce `trades.md` update expectations for approve/reject/cancel/resync side effects
3. verify operator actions remain selector-safe and latest-proposal-safe
4. prove the operator command surfaces behave coherently end-to-end

## Actionable checklist
- [ ] Inspect current operator transition code paths and `trades.md` mutations.
- [ ] Identify the minimum missing audit/state evidence for approve/reject/cancel/resync.
- [ ] Implement transition/audit hardening without weakening safety gates.
- [ ] Add focused tests for:
  - [ ] approval action records durable operator evidence
  - [ ] rejection action records durable operator evidence
  - [ ] cancel action remains broker-linked and auditable
  - [ ] resync action remains idempotent and does not duplicate operator transitions
  - [ ] operator CLI entrypoints return coherent success/failure surfaces
- [ ] Run the targeted Phase 4 test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader execution verification bundle.
- [ ] Update roadmap/checklist docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused operator-transition regression test(s)
- Existing approval / rejection / cancel / resync regression tests
- `node scripts/verify-execution-surface.js`

## Success criteria
This phase is complete when:
1. Approve / reject / cancel / resync each leave clear and durable evidence in repo surfaces.
2. Operator transitions stay constrained to valid/latest rows and broker-linked rows where applicable.
3. Operator CLI scripts behave consistently with the transition model.
4. Focused tests and the broader execution verification bundle pass.

## Non-goals
- New broker features beyond what is needed to close operator transitions.
- Broader reporting polish unrelated to operator transition trustworthiness.
- Any relaxation of writable-mode approval/safety requirements.
