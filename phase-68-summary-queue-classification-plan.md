# Phase 68: Summary queue classification plan

## Goal
Improve operator summary classification so initial open-runner handoffs and retry handoffs appear as separate queue categories, not just as one blended execution bucket.

## Scope
- classify open-runner initial queue vs retry queue distinctly in summary/queue surfaces
- keep existing trade-row contract unchanged
- add focused reporting assertions and doc touch-ups if needed

## Non-goals
- new UI stack
- broker policy changes
- scheduler integration

## Implementation steps
1. Inspect current operator queue classification logic.
2. Add distinct queue typing for initial queued rows vs queued retries.
3. Update summary/reporting surfaces to reflect the distinction clearly.
4. Add/update focused reporting tests.
5. Re-run targeted reporting and trade-state checks.

## Verification
- `node scripts/test-open-runner-retry-state.js`
- `node scripts/test-structured-summary-artifacts.js`
- targeted queue/report assertions

## Risks / watchouts
- Keep naming short and operator-readable.
- Do not duplicate counts inconsistently across surfaces.
