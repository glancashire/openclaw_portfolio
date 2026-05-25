# Phase 73: Runtime event emission alignment plan

## Goal
Bring open-runner queue and requeue commands into the structured runtime-event trail so operator-facing observability reflects actual queue/retry actions, not just inferred summaries.

## Scope
- inspect `trade.js` queue/requeue command paths and current event emission behavior
- emit structured runtime events for first-handoff queue and retry requeue actions
- extend focused command/observability tests

## Non-goals
- changing queue semantics
- changing broker execution policy
- backfilling old runtime events

## Implementation steps
1. Inspect `queue-open` and `requeue-open` command paths for the best emission seam.
2. Record structured runtime events with distinct summaries/actions for first handoff vs retry.
3. Update focused command and observability tests.
4. Re-run targeted queue/observability/reporting checks.
5. Commit and push.

## Verification
- `node scripts/test-market-open-queue-command.js`
- `node scripts/test-market-open-requeue-command.js`
- `node scripts/test-runtime-event-open-runner-summary.js`
- `node scripts/test-structured-summary-artifacts.js`

## Risks / watchouts
- Keep emitted event shapes additive and backward-compatible.
- Avoid duplicating noisy events for no-op queue/requeue attempts.
