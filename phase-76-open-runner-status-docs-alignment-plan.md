# Phase 76: Open-runner status docs alignment plan

## Goal
Align the docs with the new `trade.js status` queue visibility so operators know they can confirm first-handoff vs retry posture from the CLI as well as dashboards and summaries.

## Scope
- update maintained docs with the new status command visibility
- keep wording short and operational
- verify focused command/reporting surfaces remain green

## Non-goals
- new execution behavior
- scheduling work
- broader CLI redesign

## Implementation steps
1. Audit docs that mention `trade.js status` or queue visibility.
2. Add concise guidance for the new status output/JSON fields.
3. Re-run targeted command/reporting checks.
4. Commit and push.

## Verification
- `node scripts/test-trade-status-open-runner-visibility.js`
- `node scripts/test-market-open-queue-command.js`
- `node scripts/test-market-open-requeue-command.js`

## Risks / watchouts
- Keep docs concise and avoid duplicating the full CLI output.
