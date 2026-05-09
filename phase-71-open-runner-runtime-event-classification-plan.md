# Phase 71: Open-runner runtime event classification plan

## Goal
Make runtime-event summaries distinguish first-handoff queue activity from retry activity so operator-facing evidence lines up with the command and reporting surfaces.

## Scope
- inspect runtime event summarization/classification seam
- add lightweight differentiation for open-runner initial queue vs retry events where the data supports it
- extend focused observability/reporting tests

## Non-goals
- changing historical event payloads wholesale
- scheduler behavior
- broker execution policy changes

## Implementation steps
1. Inspect runtime-event summary logic and existing event shapes.
2. Classify queue vs retry activity in summarized observability where possible.
3. Surface the distinction in existing operator-facing summaries if it fits cleanly.
4. Add/update focused observability tests.
5. Re-run targeted observability/reporting checks.

## Verification
- existing observability-focused tests
- `node scripts/test-structured-summary-artifacts.js`
- `node scripts/test-dashboard-command-center.js`

## Risks / watchouts
- Avoid inventing event fields that are not already present or easily derivable.
- Keep the change additive and backward-compatible.
