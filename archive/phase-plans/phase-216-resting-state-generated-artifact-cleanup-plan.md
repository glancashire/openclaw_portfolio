# Phase 216 — resting-state generated artifact cleanup

## Objectives
- Reconcile the current generated artifact drift after Phase 215 so the repo can sit in a cleaner resting state for passive usage evidence collection.
- Regenerate and intentionally stage operator-facing versioned evidence that is meant to reflect current healthy state.
- Leave only explicitly ephemeral runtime churn uncommitted by default.
- Reuse the new verification visibility/staging ergonomics from Phase 215 to keep the cleanup auditable.

## Risks / dependencies
- Regeneration may touch multiple operator-facing artifacts across portfolio summaries, health reports, recovery checklists, and runtime overview surfaces.
- The artifact policy requires careful distinction between versioned evidence and ephemeral runtime state; sweeping too broadly would blur that line.
- Some generators may produce truthful but noisy diffs; commit scope should be limited to coherent current-state evidence.

## Actionable checklist
- [ ] Inspect the current dirty generated/runtime artifact set and classify each file against `artifact-policy.md`.
- [ ] Regenerate canonical portfolio and overview evidence using the established health/summary workflows where needed.
- [ ] Use the runtime evidence staging helper plus targeted staging for non-runtime versioned artifacts.
- [ ] Verify that ephemeral runtime churn remains excluded.
- [ ] Run focused artifact/reporting tests and a final full verification pass.
- [ ] Commit and push the cleaned resting-state evidence set.

## Acceptance criteria
- Versioned generated evidence reflects a coherent current healthy/resting state.
- Ephemeral runtime churn remains uncommitted unless intentionally refreshed.
- Focused artifact/reporting checks and full repository verification pass after regeneration.
- The working tree is reduced to only intentionally ephemeral leftovers or clearly deferred items.
