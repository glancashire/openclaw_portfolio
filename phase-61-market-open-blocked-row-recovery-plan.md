# Phase 61: Market-open blocked-row recovery plan

## Goal
Add a clear recovery path for trade rows blocked during market-open execution so operators can intentionally clear or requeue them after quote/trend issues resolve, without leaving ambiguous blocked state behind.

## Scope
- blocked-row recovery semantics for market-open execution rows
- trade-state helper(s) for clearing market-open block metadata
- focused tests for unblock/requeue behavior
- minimal operator documentation if the recovery path needs explanation

## Non-goals
- cron/scheduler orchestration
- transmitted-live policy changes
- automatic reapproval without explicit operator intent

## Implementation steps
1. Define how a market-open blocked row becomes actionable again.
2. Add a helper to clear market-open block metadata and set the next approval/handoff state.
3. Ensure executable-row selection includes recovered/requeued rows and excludes still-blocked rows.
4. Add focused tests for unblock/requeue behavior.
5. Run targeted trade-state and market-open selection checks.

## Verification
- `node tests/test-tradeState.js`
- `node scripts/test-market-open-trade-row-selection.js`
- `node scripts/test-market-open-execution-selection.js`

## Risks / watchouts
- Do not silently clear blocks without explicit action.
- Do not requeue rows that already have broker order ids.
- Keep recovery state auditable in `trades.md`.
