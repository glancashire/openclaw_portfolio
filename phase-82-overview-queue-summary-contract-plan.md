# Phase 82: Overview queue summary contract plan

## Goal
Tighten the overview test contract around queue-summary counters so open-runner first handoffs and retries remain explicitly verified in both direct formatting and generated artifact flows.

## Scope
- improve focused queue-summary assertions
- keep behavior unchanged
- validate overview/reporting slice remains green

## Non-goals
- new reporting features
- new execution semantics
- dashboard redesign

## Implementation steps
1. Inspect current overview queue-summary assertions and gaps.
2. Add stronger assertions for queue-summary counter presence and values.
3. Re-run targeted overview/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-multi-portfolio-overview.js`
- `node scripts/test-reporting-completeness.js`
- `node scripts/test-dashboard-command-center.js`

## Risks / watchouts
- Keep the assertions stable against ordering-neutral formatting changes.
