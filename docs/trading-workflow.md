# Trading workflow

This document is the main operator guide for the active trading path.

## Active execution path
Start with the canonical diagnostics before taking action:
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/trade.js config portfolio/etf --json`
- `node scripts/trade.js delivery portfolio/etf --json`

Then use the active workflow entry points:
- `node scripts/trade.js propose`
- `node scripts/trade.js validate`
- `node scripts/trade.js queue-open --ticker <tickerOrIsin> --action <buy|sell>`
- `node scripts/trade.js requeue-open --ticker <tickerOrIsin> --action <buy|sell>`
- `node scripts/trade.js submit`
- `node scripts/trade.js status portfolio/etf`
- `node scripts/submit-orders-at-open.js`
- `node scripts/resync-portfolio-orders.js portfolio/etf`

## Current lifecycle
1. operator checks canonical diagnostics before action (`preflight`, `authority`, `config`, `delivery`)
2. proposal is generated
3. operator approves or rejects trade rows in `trades.md`
4. operator uses `queue-open` for a first market-open handoff, or `requeue-open` after blocked-row recovery
5. market-open submission loads executable approved rows from portfolio trade state
6. broker status is reconciled back into portfolio state
7. fills/cancels/failures refresh dashboard and history

## Safety rules
- canonical diagnostic output should win over derived artifacts when they disagree
- `trade preflight` is the decisive live-readiness answer
- `trade authority` is the decisive execution-authority answer
- `trade config` is the effective redacted broker/runtime configuration surface
- `trade delivery` is the decisive delivery-posture answer
- ETF quality filter must pass
- market-hours guard applies unless explicitly forced
- approval/staging/transmitted-live are separate lanes
- blocked or already-submitted rows must not be re-submitted
- delayed-only broker pricing may support fallback pricing/reporting, but must not be treated as live-ready submission state
- runtime evidence belongs in `runtime/events/runtime-events.jsonl` and portfolio artifacts
- successful `queue-open` and `requeue-open` actions should leave matching `queue_open_runner` runtime-event evidence
- `trade.js status` should reflect the same first-handoff vs retry split that dashboards and summaries show
- `runtime/overview/portfolio-overview.md` should show the same split across portfolios via its `First handoffs` and `Retries` columns

## Primary docs
- `docs/operator-runbooks.md`
- `docs/observability.md`
- `docs/transmitted-live-operations.md`
- `docs/migration_learnings.md`

## Notes
- `scripts/execute-trades.js` is obsolete and intentionally no longer the active path.
- Prefer portfolio-backed trade execution over any static trade list.
- `Queued for open runner` is the total handoff pool; reporting now breaks that out into `Open-runner first handoffs` and `Open-runner retries` where space allows.
