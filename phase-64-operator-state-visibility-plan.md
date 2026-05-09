# Phase 64: Operator state visibility plan

## Goal
Make delayed-only readiness, open-runner queue state, and market-open blocked-row states more visible to operators through existing report/runbook surfaces, without inventing a new UI stack.

## Scope
- extend current operator-facing markdown/reporting surfaces
- surface delayed-only readiness distinctly from hard broker unavailability
- surface queued-for-open-runner and blocked-row counts/action cues
- add focused tests if reporting helpers already have coverage seams

## Non-goals
- building a new dashboard application
- changing submission policy
- adding background schedulers

## Implementation steps
1. Inspect current observability/reporting surfaces for the narrowest insertion point.
2. Add explicit status summaries for delayed, queued, and blocked states.
3. Update operator docs/runbooks to match the new visibility surface.
4. Add or update focused tests for any reporting helper touched.
5. Re-run targeted reporting/execution smoke checks.

## Verification
- targeted report/helper test(s)
- `node scripts/trade.js submit --dry-run`
- direct inspection of updated docs/report surface

## Risks / watchouts
- Keep output concise and operator-usable.
- Avoid duplicating conflicting status definitions across files.
