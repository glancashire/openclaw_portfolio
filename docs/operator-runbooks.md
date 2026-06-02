# Operator runbooks

This is the active incident, execution, and reporting reference.

## Use when
- deciding whether the broker/execution lane is safe to touch
- approving, rejecting, staging, or reconciling trade rows
- generating or sending routine dashboard / digest / health outputs
- checking what files or artifacts should have changed after an action

## Key commands

### Decide and inspect first
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/trade.js config portfolio/etf --json`
- `node scripts/trade.js delivery portfolio/etf --json`
- `node scripts/show-dashboard.js etf`
- `node scripts/run-health-check.js portfolio/etf --dry-run`
- `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily --dry-run`
- `node scripts/operator-incident-summary.js portfolio/etf`

### Act on execution state
- `node scripts/approve-portfolio-trade.js portfolio/etf '<json>'`
- `node scripts/reject-portfolio-trade.js portfolio/etf '<json>'`
- `node scripts/stage-portfolio-order.js portfolio/etf '<json>' stage`
- `node scripts/trade.js queue-open --ticker <tickerOrIsin> --action <buy|sell>`
- `node scripts/trade.js requeue-open --ticker <tickerOrIsin> --action <buy|sell>`
- `node scripts/trade.js status portfolio/etf`
- `node scripts/resync-portfolio-orders.js portfolio/etf`

### Rebuild or communicate reporting state
- `node scripts/regenerate-dashboard.js etf`
- `node scripts/generate-report.js portfolio/etf weekly`
- `node scripts/run-health-check.js portfolio/etf --send-email`
- `node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily`
- `node scripts/send-email-verification.js portfolio/etf --to user@example.com`

## What to check after action

### Execution evidence
- `trades.md`
- `history.md`
- `runtime/execution-state.json`
- `runtime/events/runtime-events.jsonl`
- `runtime/overview/portfolio-overview.md`

### Reporting artifacts
- `dashboard.md`
- `portfolio/etf/health-report.{md,html,json}`
- dated files under `portfolio/etf/reports/weekly/`, `monthly/`, or `quarterly/`
- digest CLI JSON output for recipient / attempted / sent state

### Contract references
- `docs/execution-command-surface.md`
- `docs/reporting-command-surface.md`

## Broker readiness note
- Treat `reason: delayed_data_only` as a degraded-but-connected state.
- In that state, broker-backed pricing may use delayed fallback values for analysis and dry-runs.
- Do not treat delayed-only pricing as permission for live submission.

## Operator reading guide
- Start with `trade.js preflight` for decisive live-readiness truth before treating any portfolio as transmission-ready.
- Use `trade.js authority` when you need the canonical execution-authority view across execution mode, broker readiness, runtime pause, and live-arm state.
- Use `trade.js config` when you need the effective broker/runtime config surface without exposing secrets.
- Use `trade.js delivery` when you need the canonical delivery-posture answer instead of inferring from dashboards.
- Use `show-dashboard.js` for a human console summary; use the reporting command surface doc when you need to know which commands emit JSON, write artifacts, or send email.
- `check-transmitted-live-readiness.js` remains a compatibility diagnostic, not the primary readiness surface.
- If `Queued for open runner` is non-zero, confirm those rows are still intended before the market-open run.
- `Open-runner first handoffs` should usually reflect newly queued rows that have not yet had a market-open attempt.
- `Open-runner retries` should only reflect rows that were blocked, reviewed, and intentionally requeued.
- Use `queue-open` for the first handoff of an eligible row.
- Use `requeue-open` only after a row was blocked and explicitly reviewed for retry.
- Use `trade.js status` when you want a quick CLI check of first-handoff vs retry counts without opening `dashboard.md` or `summary.md`.
- Use `runtime/overview/portfolio-overview.md` when you want the same first-handoff vs retry split across multiple portfolios in one place.
- Use `run-health-check.js` and digest/reporting surfaces when the issue is health, communication, or operator confidence rather than immediate execution authority.
- Confirm command evidence in `runtime/events/runtime-events.jsonl`: successful first handoffs emit `queue_open_runner` with `retry: false`, while retries emit `queue_open_runner` with `retry: true`.
- If `Blocked rows` is non-zero, inspect blocker fields in `trades.md` and use the recovery/requeue workflow before retrying.
- If broker readiness is degraded, treat pricing as review-only unless readiness returns to live-safe posture.

## Obsolete material
- The orphan dashboard-email helper trio was retired to `archive/scripts/legacy-dashboard-email/`.
- Old duplicate operator notes were folded into this file and `docs/reporting-command-surface.md`.

## Runtime state vs evidence

When verification re-dirties runtime event/state files, treat that as operational evidence, not a source regression.
