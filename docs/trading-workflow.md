# Trading workflow

This document is the main operator guide for the active trading path.

## Active execution path
Use these entry points:
- `node scripts/trade.js propose`
- `node scripts/trade.js validate`
- `node scripts/trade.js submit`
- `node scripts/submit-orders-at-open.js`
- `node scripts/resync-portfolio-orders.js portfolio/etf`

## Current lifecycle
1. proposal is generated
2. operator approves or rejects trade rows in `trades.md`
3. operator uses `queue-open` for a first market-open handoff, or `requeue-open` after blocked-row recovery
4. market-open submission loads executable approved rows from portfolio trade state
5. broker status is reconciled back into portfolio state
6. fills/cancels/failures refresh dashboard and history

## Safety rules
- ETF quality filter must pass
- market-hours guard applies unless explicitly forced
- approval/staging/transmitted-live are separate lanes
- blocked or already-submitted rows must not be re-submitted
- delayed-only broker pricing may support fallback pricing/reporting, but must not be treated as live-ready submission state
- runtime evidence belongs in `runtime/events/runtime-events.jsonl` and portfolio artifacts

## Primary docs
- `docs/operator-runbooks.md`
- `docs/observability.md`
- `docs/transmitted-live-operations.md`
- `docs/migration_learnings.md`

## Notes
- `scripts/execute-trades.js` is obsolete and intentionally no longer the active path.
- Prefer portfolio-backed trade execution over any static trade list.
- `Queued for open runner` is the total handoff pool; reporting now breaks that out into `Open-runner first handoffs` and `Open-runner retries` where space allows.
