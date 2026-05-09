# Phase 66: Open-runner retry policy plan

## Goal
Make market-open runner retries explicit and auditable for blocked/recoverable rows, without introducing background scheduling. The operator should be able to distinguish rows that are queued once from rows intentionally re-queued after recovery.

## Scope
- add explicit retry/requeue note semantics for market-open rows
- preserve submitted-row protection
- expose retry intent through existing command/reporting surfaces
- add focused tests for retry/requeue semantics

## Non-goals
- cron scheduling
- automatic repeated retries
- changing broker submission policy

## Implementation steps
1. Inspect current queue/requeue helpers and identify the missing retry-intent state.
2. Add explicit retry note/marker behavior using the existing trade-row contract.
3. Update command/reporting surfaces to expose retry semantics clearly.
4. Add focused tests for queue vs requeue behavior.
5. Re-run targeted trade-state, queue-command, and summary checks.

## Verification
- `node scripts/test-market-open-blocked-row-recovery.js`
- `node scripts/test-market-open-queue-command.js`
- `node scripts/test-structured-summary-artifacts.js`
- `node tests/test-tradeState.js`

## Risks / watchouts
- Do not allow submitted rows back into queue/retry flows.
- Keep state explicit in existing columns instead of inventing hidden side channels.
