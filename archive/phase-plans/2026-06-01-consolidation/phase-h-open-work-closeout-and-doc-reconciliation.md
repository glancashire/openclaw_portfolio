# Phase H — Open-work closeout and doc reconciliation

## Objective
Reconcile the canonical open-work tracking documents with the actual repo state after Phase G so that remaining items are classified truthfully as complete, decision-only, blocked, waiting on external access, or intentionally parked.

## Risks / dependencies
- The working tree contains lots of generated/runtime churn; this phase must stay source/docs-only.
- Must not accidentally reopen completed engineering lanes by copying stale wording forward.
- Need to distinguish deferred technical debt (e.g. a robust external quote adapter) from true blocking open work.

## Action checklist
- [ ] Inspect canonical tracking surfaces (`OPEN_PHASES_OVERVIEW.md`, `PHASE_OVERVIEW.md`, relevant plan/harvester notes).
- [ ] Decide how to classify the remaining external-quote-adapter idea after Phase G.
- [ ] Update open-work docs to mark Phase G complete and separate engineering-complete vs decision/infra blockers.
- [ ] Update the harvester file so a future agent can see that no active implementation lane remains unless new source becomes available.
- [ ] Run focused verification on doc/plan contracts plus a final broad gate.
- [ ] Commit and push the closeout.

## Acceptance criteria
- Canonical open-work docs no longer imply unfinished engineering that is already landed.
- Phase G is reflected as complete with its remaining technical debt explicitly labeled non-blocking.
- Remaining items are clearly categorized: decision-only, external infra, blocked source access, or parked WIP.
- Verification passes and the closeout is committed and pushed.
