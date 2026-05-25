# Phase 3 — trade blocking and safety hardening plan

## Goal
Stop unsafe live or staged trade paths before they touch broker state by enforcing unresolved-strategy blockers, approved-vs-excluded instrument consistency, stale-price blocking, and stronger broker/account certainty checks.

## Scope for this phase
- Block trading when `portfolio.md` still contains unresolved open questions.
- Validate and block when an instrument appears in both Approved Instruments and Excluded Instruments.
- Block live/staged execution when holdings pricing is stale or explicitly simulated.
- Tighten broker/account mismatch or uncertain broker-state blocking where current evidence is weak.
- Add focused automated tests for these blocking behaviors.
- Update progress docs when verified.

## Actionable checklist
- [x] Inspect current safety validation and execution policy code paths.
- [x] Identify the minimum code changes needed for unresolved-question, consistency, stale-price, and broker-certainty blocking.
- [x] Implement or tighten the validation/execution blockers.
- [x] Add focused tests for:
  - [x] unresolved open questions blocking execution
  - [x] approved/excluded overlap blocking execution
  - [x] stale holdings pricing blocking execution
  - [x] simulated pricing blocking execution remains blocked
  - [x] broker/account uncertainty blocking execution
- [x] Run the targeted safety test set.
- [x] If any test fails, iterate until green.
- [x] Run the broader execution/safety verification bundle.
- [x] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Verification gate
This phase is complete only when:
1. All new targeted safety-block tests pass.
2. Existing execution/safety verification still passes.
3. Docs reflect the verified blocker coverage.

## Expected follow-on
After this phase, move directly into history/dashboard/report freshness and then rebalancing hardening unless new evidence shows a smaller remaining acceptance blocker.