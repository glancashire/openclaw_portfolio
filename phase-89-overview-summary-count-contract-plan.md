# Phase 89: Overview summary-count contract plan

## Goal
Tighten the direct contract for the overview summary counts so the active/demo-like portfolio totals and pending-action counts remain explicitly verified alongside the newer open-runner visibility contracts.

## Scope
- inspect current summary-count coverage
- add focused helper-level assertions where still implicit
- keep behavior unchanged

## Non-goals
- new summary behavior
- reporting redesign
- broker/runtime changes

## Implementation steps
1. Inspect the current summary-count assertions in the overview test.
2. Add focused helper-level assertions for stable summary fields that are still only indirectly covered.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Avoid duplicating every rendered assertion; focus on stable summary fields that matter for operator posture.
