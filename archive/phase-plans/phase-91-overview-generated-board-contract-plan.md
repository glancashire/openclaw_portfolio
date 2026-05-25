# Phase 91: Overview generated-board contract plan

## Goal
Strengthen the generated overview-board contract by explicitly asserting that the generated `portfolio-overview.md` contains both populated portfolio rows with the open-runner first-handoff and retry columns.

## Scope
- inspect current generated overview-board assertions
- add focused generated-file checks for populated rows
- keep behavior unchanged

## Non-goals
- new overview behavior
- reporting redesign
- broker/runtime changes

## Implementation steps
1. Inspect the current generated overview artifact assertions for board rows.
2. Add direct generated-markdown assertions for populated board rows.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Keep checks tied to existing stable operator-facing row text so they catch artifact regressions without broad fixture churn.
