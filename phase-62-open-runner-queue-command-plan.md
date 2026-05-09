# Phase 62: Open-runner queue command plan

## Goal
Add an explicit operator command surface for queueing approved or recovered trade rows for the market-open runner, so scheduled/manual open execution has a clean, auditable handoff target.

## Scope
- CLI command to mark rows as queued for open-runner execution
- reuse existing trade-state helpers where possible
- focused tests for queue command behavior
- concise operator doc update for the new command

## Non-goals
- background cron creation in this phase
- automatic time-based scheduling
- transmitted-live execution policy changes

## Implementation steps
1. Add a queue command to `scripts/trade.js` or a nearby operator script.
2. Use explicit trade-row selectors and write queued state into `trades.md`.
3. Ensure already submitted rows are not queueable.
4. Add focused tests for queueing and requeueing behavior.
5. Update operator docs with the new queue command.
6. Re-run targeted command-surface and trade-state tests.

## Verification
- `node scripts/test-market-open-queue-command.js`
- `node tests/test-tradeState.js`
- `node scripts/test-market-open-trade-row-selection.js`
- `node scripts/trade.js --help`

## Risks / watchouts
- Do not allow ambiguous queueing of already-submitted rows.
- Keep the command output simple and auditable.
- Avoid coupling queueing logic to actual scheduler behavior yet.
