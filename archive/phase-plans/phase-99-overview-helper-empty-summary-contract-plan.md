# Phase 99: Overview helper empty-summary contract plan

## Goal
Strengthen the empty-state helper contract for `summarizeOverview(...)` so zero-portfolio totals remain explicit and stable alongside the newer overview rendering checks.

## Scope
- inspect current empty-state summary helper coverage
- add focused zero-state summary assertions
- keep behavior unchanged

## Non-goals
- summary logic changes
- new overview behavior
- broker/runtime changes

## Implementation steps
1. Inspect the current empty-state coverage for `summarizeOverview(...)`.
2. Add focused helper-level zero-state assertions.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Keep assertions on stable zero-state values only; avoid duplicating broader render tests.
