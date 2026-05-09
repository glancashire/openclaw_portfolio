# Phase 95: Overview index severity contract plan

## Goal
Strengthen the generated overview index contract by explicitly asserting the presence and numeric typing of `queueSummary.bySeverity` counters.

## Scope
- inspect current severity-summary assertions
- add focused generated-artifact checks for `high`, `medium`, and `low`
- keep behavior unchanged

## Non-goals
- severity logic changes
- new overview behavior
- broker/runtime changes

## Implementation steps
1. Inspect the current coverage for `queueSummary.bySeverity`.
2. Add focused generated-artifact checks for stable severity counters.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Focus on presence and numeric typing; real values can vary with runtime state.
