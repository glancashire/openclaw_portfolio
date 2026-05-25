# Phase 83: Overview board empty-state contract plan

## Goal
Harden the empty-state contract for the multi-portfolio overview board so the new first-handoff and retry columns remain present and stable even when no portfolios are discovered.

## Scope
- inspect empty-state rendering in overview board
- add focused empty-state test coverage
- keep runtime behavior unchanged

## Non-goals
- changes to portfolio discovery
- reporting redesign
- broker/runtime changes

## Implementation steps
1. Inspect the no-portfolio overview render path.
2. Add focused assertions for empty-state row/header consistency.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Keep the test stable and literal; empty-state formatting is a small but easy regression point.
