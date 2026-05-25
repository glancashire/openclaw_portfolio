# Phase 77: Open-runner status observability plan

## Goal
Extend the lightweight observability surfaces so the `trade.js status` first-handoff vs retry split is visible in the runtime overviews/operators’ quick-inspection flow, not only in the command itself.

## Scope
- inspect overview generation seams that summarize operator/runtime state
- add concise open-runner status visibility where it fits cleanly
- update focused overview/reporting tests

## Non-goals
- new queue semantics
- broker behavior changes
- dashboard redesign

## Implementation steps
1. Inspect runtime overview/reporting seams for status-summary insertion points.
2. Add concise first-handoff vs retry visibility derived from existing helpers.
3. Update focused tests.
4. Re-run targeted overview/reporting checks.
5. Commit and push.

## Verification
- existing overview/reporting tests
- `node scripts/test-trade-status-open-runner-visibility.js`

## Risks / watchouts
- Keep the added overview output short and avoid duplicating whole dashboard sections.
