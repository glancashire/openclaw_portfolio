# Phase 86: Overview recommended-actions empty-state plan

## Goal
Harden the empty-state contract for the cross-portfolio recommended-actions section so it remains explicit and stable when there are no pending items.

## Scope
- inspect empty-state recommended-action rendering
- add focused assertions
- keep behavior unchanged

## Non-goals
- new action ranking logic
- reporting redesign
- broker/runtime changes

## Implementation steps
1. Inspect the current no-item recommended-actions render path.
2. Add direct overview test coverage for the empty-state wording.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Keep the empty-state wording stable and short; it is operator-facing filler only when there is genuinely nothing pending.
