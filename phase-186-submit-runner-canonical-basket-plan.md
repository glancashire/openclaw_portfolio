# Phase 186 — Canonical Basket Submit Runner Plan

## Objective
Make approved basket execution use the approval envelope as the single canonical submit input so proposal-side stale blockage (for example missing primary exchange in the proposal artifact) cannot prevent or confuse live submission once the approved envelope is valid.

## Risks / dependencies
- Live execution paths are safety-sensitive; tests must prove no accidental submit behavior changes.
- Reconciliation and UI/reporting surfaces depend on execution state shape.
- Legacy proposal artifacts still exist and may contradict approval envelopes.

## Actionable checklist
- [ ] Inspect basket execution runner and order preparation for proposal-vs-approval dependencies.
- [ ] Change submit path to rely on approval envelope leg execution fields only.
- [ ] Ensure proposal blocked flags do not veto approved-envelope submission.
- [ ] Record explicit submission/run state for approved baskets.
- [ ] Add unit/integration/regression tests for canonical basket submission behavior.
- [ ] Verify readiness, runner, and reconciliation tests pass together.

## Acceptance criteria
- An approved basket with valid envelope legs is executable even if the source proposal contains stale blocked metadata.
- Submission state is recorded explicitly for the basket runner.
- Reconciliation can distinguish approved-but-not-submitted from submitted baskets.
- Focused basket/readiness/reconciliation tests pass without regressions.
