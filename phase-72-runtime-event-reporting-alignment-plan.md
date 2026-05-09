# Phase 72: Runtime event reporting alignment plan

## Goal
Thread the new open-runner runtime-event classification into operator-facing reporting summaries so runtime evidence, dashboards, and summary artifacts tell the same first-handoff vs retry story.

## Scope
- inspect reporting surfaces that already consume runtime event summaries
- expose open-runner runtime-event counts where they fit cleanly
- extend focused reporting tests to cover the new lines

## Non-goals
- changing runtime event emission semantics
- changing queue-state heuristics in trade rows
- broker execution behavior

## Implementation steps
1. Inspect dashboard/summary/report consumers of `summarizeRuntimeEvents(...)`.
2. Add first-handoff and retry runtime-event counts to the most stable operator-facing reporting surfaces.
3. Update focused reporting tests.
4. Re-run targeted reporting/observability checks.
5. Commit and push.

## Verification
- `node scripts/test-runtime-event-open-runner-summary.js`
- `node scripts/test-structured-summary-artifacts.js`
- `node scripts/test-dashboard-command-center.js`
- `node scripts/test-reporting-completeness.js`

## Risks / watchouts
- Avoid duplicating trade-row queue counts while still making runtime evidence visible.
- Keep additions concise and operator-readable.
