# Operator runbooks

This is the active incident and operator reference.

## Use when
- approving or rejecting trade rows
- staging or transmitting orders
- resyncing open broker orders
- handling broker pause / readiness failures
- reconciling fills and cancels

## Key commands
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/trade.js config portfolio/etf --json`
- `node scripts/trade.js delivery portfolio/etf --json`
- `node scripts/approve-portfolio-trade.js portfolio/etf '<json>'`
- `node scripts/reject-portfolio-trade.js portfolio/etf '<json>'`
- `node scripts/trade.js queue-open --ticker <tickerOrIsin> --action <buy|sell>`
- `node scripts/trade.js requeue-open --ticker <tickerOrIsin> --action <buy|sell>`
- `node scripts/trade.js status portfolio/etf`
- `node scripts/run-health-check.js portfolio/etf --dry-run`
- `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run`
- `node scripts/stage-portfolio-order.js portfolio/etf '<json>' stage`
- `runtime/overview/portfolio-overview.md`
- `node scripts/check-transmitted-live-readiness.js portfolio/etf '<json>'`
- `node scripts/resync-portfolio-orders.js portfolio/etf`
- `node scripts/operator-incident-summary.js portfolio/etf`

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
- Start with `trade.js preflight` for decisive live-readiness truth before treating any portfolio as transmission-ready.
- Use `trade.js authority` when you need the canonical execution-authority view across execution mode, broker readiness, runtime pause, and live-arm state.
- Use `trade.js config` when you need the effective broker/runtime config surface without exposing secrets.
- Use `trade.js delivery` when you need the canonical delivery-posture answer instead of inferring from dashboards.
- If `Queued for open runner` is non-zero, confirm those rows are still intended before the market-open run.
- `Open-runner first handoffs` should usually reflect newly queued rows that have not yet had a market-open attempt.
- `Open-runner retries` should only reflect rows that were blocked, reviewed, and intentionally requeued.
- Use `queue-open` for the first handoff of an eligible row.
- Use `requeue-open` only after a row was blocked and explicitly reviewed for retry.
- Use `trade.js status` when you want a quick CLI check of first-handoff vs retry counts without opening `dashboard.md` or `summary.md`.
- Use `runtime/overview/portfolio-overview.md` when you want the same first-handoff vs retry split across multiple portfolios in one place.
- Use `run-health-check.js` and digest/reporting surfaces when the issue is health, communication, or operator confidence rather than immediate execution authority.
- Confirm command evidence in `runtime/events/runtime-events.jsonl`: successful first handoffs now emit `queue_open_runner` with `retry: false`, while retries emit `queue_open_runner` with `retry: true`.
- If `Blocked rows` is non-zero, inspect blocker fields in `trades.md` and use the recovery/requeue workflow before retrying.
- If broker readiness is degraded, treat pricing as review-only unless readiness returns to live-safe posture.

## Obsolete material
Old duplicate operator notes were folded into this file. If a runbook is no longer used, remove it instead of keeping multiple versions.


## Runtime state vs evidence

When verification re-dirties only the runtime event/state files, that is expected ephemeral churn. Treat it as operational evidence, not a source regression.
