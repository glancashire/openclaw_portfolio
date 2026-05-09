# Phase 87: Overview queue-summary empty-state plan

## Goal
Harden the empty-state contract for the overview queue-summary helper so the open-runner first-handoff and retry counters remain explicit and stable even when all counts are zero.

## Scope
- inspect the zero-count queue-summary render path
- add focused helper-level and rendered-overview assertions
- keep behavior unchanged

## Non-goals
- new reporting behavior
- queue semantics changes
- broker/runtime changes

## Implementation steps
1. Inspect the current zero-count queue-summary output path.
2. Add direct assertions for empty-state queue-summary lines.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Keep assertions tied to stable operator-facing labels already used elsewhere.
