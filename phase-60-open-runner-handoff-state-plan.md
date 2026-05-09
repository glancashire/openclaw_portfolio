# Phase 60: Open-runner handoff state plan

## Goal
Make the market-open runner lifecycle more explicit by supporting a clean handoff state for approved rows that are intentionally queued for the open runner, while keeping retries and blocked rows auditable.

## Scope
- trade-state support for open-runner handoff semantics
- selection behavior for queued rows
- focused tests for queued/open-runner-eligible rows
- minimal docs or comments only if needed for clarity

## Non-goals
- scheduler/cron orchestration changes
- changing transmitted-live approval policy
- redesigning the proposal/approval workflow

## Implementation steps
1. Define the intended queued/open-runner approval/status combination.
2. Ensure executable-row selection handles queued rows explicitly and predictably.
3. Add a small helper or test fixture path for rows handed to the open runner.
4. Verify blocked rows still stay excluded until operator action clears them.
5. Run focused state/selection tests.

## Verification
- `node scripts/test-market-open-trade-row-selection.js`
- `node tests/test-tradeState.js`
- `node scripts/test-market-open-execution-selection.js`

## Risks / watchouts
- Do not let blocked rows accidentally re-enter executable selection.
- Keep the queued state explicit instead of overloading unrelated statuses.
