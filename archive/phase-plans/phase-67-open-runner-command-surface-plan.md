# Phase 67: Open-runner command surface plan

## Goal
Round out the operator command surface for the market-open runner by adding an explicit requeue command, so recovery from blocked rows no longer requires direct helper usage or implicit workflow knowledge.

## Scope
- add a `trade.js` command for blocked-row requeue
- keep queue vs requeue semantics distinct and auditable
- preserve submitted-row protection
- add focused command tests and operator docs updates

## Non-goals
- automatic retries
- scheduler integration
- direct broker submission changes

## Implementation steps
1. Add `trade.js requeue-open` command over the shared blocked-row recovery helper.
2. Return explicit retry metadata in command output.
3. Add focused command tests for blocked-row recovery via CLI.
4. Update operator docs for queue vs requeue usage.
5. Re-run targeted command/trade-state/reporting checks.

## Verification
- `node scripts/test-market-open-blocked-row-recovery.js`
- `node scripts/test-market-open-queue-command.js`
- new requeue command test
- `node tests/test-tradeState.js`

## Risks / watchouts
- Do not let the new command requeue submitted rows.
- Keep queue-open and requeue-open behavior clearly separated.
