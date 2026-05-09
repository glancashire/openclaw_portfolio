# Operator runbooks

This is the active incident and operator reference.

## Use when
- approving or rejecting trade rows
- staging or transmitting orders
- resyncing open broker orders
- handling broker pause / readiness failures
- reconciling fills and cancels

## Key commands
- `node scripts/approve-portfolio-trade.js portfolio/etf '<json>'`
- `node scripts/reject-portfolio-trade.js portfolio/etf '<json>'`
- `node scripts/trade.js queue-open --ticker <tickerOrIsin> --action <buy|sell>`
- `node scripts/trade.js requeue-open --ticker <tickerOrIsin> --action <buy|sell>`
- `node scripts/stage-portfolio-order.js portfolio/etf '<json>' stage`
- `node scripts/check-transmitted-live-readiness.js portfolio/etf '<json>'`
- `node scripts/resync-portfolio-orders.js portfolio/etf`

## What to check after action
- `trades.md`
- `history.md`
- `dashboard.md`
- `runtime/execution-state.json`
- `runtime/events/runtime-events.jsonl`
- portfolio `summary.md` / `summary.html` execution posture section for queued, retry, and blocked counts
- runtime-event evidence for `queue_open_runner` summaries confirming first handoff vs retry intent

## Broker readiness note
- Treat `reason: delayed_data_only` as a degraded-but-connected state.
- In that state, broker-backed pricing may use delayed fallback values for analysis/dry-runs.
- Do not treat delayed-only pricing as permission for live submission.

## Operator reading guide
- If `Queued for open runner` is non-zero, confirm those rows are still intended before the market-open run.
- `Open-runner first handoffs` should usually reflect newly queued rows that have not yet had a market-open attempt.
- `Open-runner retries` should only reflect rows that were blocked, reviewed, and intentionally requeued.
- Use `queue-open` for the first handoff of an eligible row.
- Use `requeue-open` only after a row was blocked and explicitly reviewed for retry.
- Confirm command evidence in `runtime/events/runtime-events.jsonl`: successful first handoffs now emit `queue_open_runner` with `retry: false`, while retries emit `queue_open_runner` with `retry: true`.
- If `Blocked rows` is non-zero, inspect blocker fields in `trades.md` and use the recovery/requeue workflow before retrying.
- If broker readiness is degraded, treat pricing as review-only unless readiness returns to live-safe posture.

## Obsolete material
Old duplicate operator notes were folded into this file. If a runbook is no longer used, remove it instead of keeping multiple versions.
