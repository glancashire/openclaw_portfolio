# Phase 88: Overview recommended-action helper contract plan

## Goal
Make the helper-level contract for overview recommended-action rendering more explicit by directly testing the formatted output for both open-runner first-handoff and retry items.

## Scope
- inspect current helper-level recommended-action coverage
- add direct assertions for rendered helper text
- keep behavior unchanged

## Non-goals
- new wording changes beyond current labels
- reporting redesign
- broker/runtime changes

## Implementation steps
1. Inspect the current helper-level recommended-action assertions.
2. Add direct helper output assertions for first-handoff and retry items.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Keep helper assertions aligned with existing operator-facing output so they catch regressions without overfitting internals.
