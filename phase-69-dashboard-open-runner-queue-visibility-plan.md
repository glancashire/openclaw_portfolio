# Phase 69: Dashboard open-runner queue visibility plan

## Goal
Bring the same initial-vs-retry queue distinction into the dashboard-facing operator action surface so the lightweight dashboard view matches the richer summary/reporting posture.

## Scope
- add explicit dashboard operator-action entries for first handoff vs retry handoff
- extend dashboard queue summary output if needed
- add focused dashboard/reporting coverage

## Non-goals
- new dashboard renderer
- scheduler logic
- broker execution changes

## Implementation steps
1. Inspect dashboard operator-action builder and summary output.
2. Add open-runner first-handoff and retry items using existing trade-state summary data.
3. Update queue summary formatting if needed for dashboard parity.
4. Add/update focused dashboard reporting tests.
5. Re-run targeted dashboard/reporting checks.

## Verification
- dashboard-focused reporting test
- `node scripts/test-structured-summary-artifacts.js`
- `node scripts/test-open-runner-retry-state.js`

## Risks / watchouts
- Keep dashboard language short.
- Avoid double-counting queue items across dashboard and summary logic.
