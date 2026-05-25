# Phase 215 — verification visibility and runtime evidence staging

## Objectives
- Make repository verification visibly progress through long-running checks so `npm test` no longer appears stuck during quiet stretches.
- Preserve the existing verification contract while surfacing per-check timing and an explicit completion summary.
- Reduce operator friction when staging intentionally versioned `runtime/overview/*` evidence that lives under a broadly ignored `runtime/` tree.
- Keep runtime-ephemeral churn (`runtime/events/runtime-events.jsonl`, `runtime/execution-state.json`) out of the staging helper by default.

## Risks / dependencies
- Verification wrappers currently mix short checks with long quiet checks; changes must not hide child failures or alter exit codes.
- The runtime artifact policy intentionally distinguishes reviewable generated evidence from ephemeral runtime churn; staging ergonomics must follow that contract rather than weaken it.
- Some generated portfolio artifacts are also versioned evidence; any helper should stay narrow and predictable instead of staging unrelated churn.

## Actionable checklist
- [ ] Refactor verification check lists into shared modules with regression coverage so wrapper behavior can be tested without duplicating check arrays.
- [ ] Update `scripts/verify-repo.js` and `scripts/verify-execution-surface.js` to print start/finish markers, durations, and an explicit final summary while preserving failure behavior.
- [ ] Add tests for verification wrapper progress reporting and list coverage.
- [ ] Add a small staging helper for versioned runtime evidence plus regression tests that prove it selects only intended files.
- [ ] Remove temporary debugging helpers before finalizing the phase.
- [ ] Run focused verification tests, then full `npm test`, then commit and push.

## Acceptance criteria
- Running repository verification shows clear progress before and after each top-level check, including long-running ones.
- Verification exits cleanly with an explicit success summary and preserves non-zero exit behavior on failures.
- A dedicated helper stages versioned runtime evidence without including known ephemeral runtime files.
- New/updated tests cover wrapper behavior and runtime evidence staging selection.
- Full repository verification passes after the implementation.
