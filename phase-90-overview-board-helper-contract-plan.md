# Phase 90: Overview board helper contract plan

## Goal
Make the helper-level contract for `buildPortfolioTable(...)` more explicit by directly asserting the formatted row output, including the open-runner first-handoff and retry columns.

## Scope
- inspect direct helper coverage for the board table
- add focused helper-level row assertions
- keep behavior unchanged

## Non-goals
- new board wording
- reporting redesign
- broker/runtime changes

## Implementation steps
1. Inspect the current direct coverage for `buildPortfolioTable(...)`.
2. Add focused helper-level assertions for populated and empty rows.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Keep assertions literal but narrow; they should catch table-column regressions without duplicating every markdown assertion.
