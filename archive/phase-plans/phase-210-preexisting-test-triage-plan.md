# Phase 210 Plan — pre-existing test triage

## Objectives
- Triage the seven historically flagged failing tests against the current repo state.
- Determine which are already green, which still fail under broader/full test execution, and which need fixes vs documentation.
- Land the smallest safe changes needed so the project has a truthful baseline for remaining failures.

## Risks / Dependencies
- The current default `npm test` path does not execute the broader script battery, so some failures may only surface under `npm run test:all` or direct invocation.
- Some tests may depend on older assumptions that have already drifted with later phases; triage must separate true defects from stale expectations.
- Runtime/generated files are noisy in the worktree; avoid mixing unrelated artifact churn into the phase commits.

## Actionable Checklist
- [ ] Run the seven flagged tests directly to establish the real current baseline.
- [ ] Inspect failing assertions and affected code paths.
- [ ] Fix the failures where the intended behavior is clear and low-risk.
- [ ] If any remain intentionally red, document them in `docs/known-test-failures.md` with rationale and rerun strategy.
- [ ] Add or adjust regression coverage for each fixed test.
- [ ] Run `npm run test:all` plus `npm test` before closing the phase.
- [ ] Commit implementation/docs and push.

## Acceptance Criteria
- Each of the seven historically flagged tests is either passing or explicitly documented as ACCEPTED RED.
- `npm run test:all` completes with no unaccounted-for failures.
- `npm test` still passes.
