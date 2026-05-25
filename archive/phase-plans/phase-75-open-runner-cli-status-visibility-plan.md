# Phase 75: Open-runner CLI status visibility plan

## Goal
Expose first-handoff vs retry queue visibility in the `trade.js status` command surface so operators can confirm queue posture without opening multiple artifacts.

## Scope
- inspect existing `trade.js status` output
- add concise open-runner queue/retry summary using portfolio trade-state helpers
- update focused CLI tests

## Non-goals
- broker API changes
- dashboard/reporting redesign
- new queue semantics

## Implementation steps
1. Inspect `trade.js status` output seam and available trade-state helpers.
2. Add concise queued-first vs queued-retry visibility to status output/JSON.
3. Update focused CLI tests.
4. Re-run targeted command/reporting checks.
5. Commit and push.

## Verification
- `node scripts/test-market-open-queue-command.js`
- `node scripts/test-market-open-requeue-command.js`
- add/update focused status command test

## Risks / watchouts
- Keep status output terse and avoid requiring live broker connectivity for the new fields.
