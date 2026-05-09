# Phase 84: Overview module export contract plan

## Goal
Harden the export contract of the overview board helpers so newly added helper functions remain intentionally exported and directly testable.

## Scope
- inspect overviewBoard module exports
- add focused test assertions for helper availability
- keep behavior unchanged

## Non-goals
- new overview behavior
- reporting redesign
- broker/runtime changes

## Implementation steps
1. Inspect overviewBoard exports and current import/test usage.
2. Add focused assertions for helper exports used by the overview tests.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Keep this light; the point is to catch accidental export regressions, not to over-specify internals.
