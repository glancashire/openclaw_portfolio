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
- [ ] Inspect current safety validation and execution policy code paths.
- [ ] Identify the minimum code changes needed for unresolved-question, consistency, stale-price, and broker-certainty blocking.
- [ ] Implement or tighten the validation/execution blockers.
- [ ] Add focused tests for:
  - [ ] unresolved open questions blocking execution
  - [ ] approved/excluded overlap blocking execution
  - [ ] stale holdings pricing blocking execution
  - [ ] simulated pricing blocking execution remains blocked
  - [ ] broker/account uncertainty blocking execution
- [ ] Run the targeted safety test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader execution/safety verification bundle.
- [ ] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Verification gate
This phase is complete only when:
1. All new targeted safety-block tests pass.
2. Existing execution/safety verification still passes.
3. Docs reflect the verified blocker coverage.

## Expected follow-on
After this phase, move directly into history/dashboard/report freshness and then rebalancing hardening unless new evidence shows a smaller remaining acceptance blocker.