# Phase 85: Overview queue summary helper contract plan

## Goal
Make the queue-summary helper contract more explicit by directly testing the formatted summary output for open-runner counters, alongside the broader overview rendering checks.

## Scope
- add focused helper-level assertions for `formatQueueSummary`
- keep behavior unchanged
- validate the same overview/reporting slice afterwards

## Non-goals
- new reporting features
- text wording redesign beyond the existing labels
- broker/runtime changes

## Implementation steps
1. Inspect current helper-level coverage gaps around `formatQueueSummary`.
2. Add direct assertions for open-runner first-handoff and retry lines.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Keep helper assertions aligned with stable labels already used across docs and artifacts.
