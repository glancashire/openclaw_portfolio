# Observability

## What exists
- `runtime/events/runtime-events.jsonl` for structured runtime evidence
- `runtime/execution-state.json` for broker pause state
- portfolio dashboards and history files for operator-facing state
- structured summary/overview artifacts under `portfolio/<name>/summary.json` and `runtime/overview/*`
- health-report and dashboard-digest delivery/reporting surfaces for operator and investor-facing review
- emerging market-calendar artifacts under `runtime/market-calendar/` as the calendar lane is completed

## Typical checks
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/trade.js config portfolio/etf --json`
- `node scripts/trade.js delivery portfolio/etf --json`
- `node scripts/trade.js status portfolio/etf`
- `runtime/overview/portfolio-overview.md`
- `node scripts/show-runtime-events.js --portfolio etf`
- `node scripts/check-risk-observability.js portfolio/etf`
- `node scripts/check-safety-controls.js portfolio/etf`
- `node scripts/check-interactive-brokers-readiness.js portfolio/etf`

## Readiness interpretation
- `reason: ready` means broker connectivity plus live/realtime pricing are available.
- `reason: delayed_data_only` means connectivity is up but pricing is delayed-only and execution posture remains degraded/dry-run only.
- `fallbackRequired: true` means operator-facing dashboards and runbooks should treat the broker path as degraded, even if pricing fallback is usable.

## Trade-state interpretation
- `Queued for open runner` means rows were intentionally handed off and are waiting for the market-open submission path.
- `Open-runner first handoffs` means rows queued via the initial `queue-open` path.
- `Open-runner retries` means previously blocked rows were explicitly recovered and requeued via `requeue-open`.
- `Blocked rows` means market-open execution skipped rows and wrote explicit blocker metadata (`Block code`, `Block reason`, `Blocked at`, `Next action`) into `trades.md`.
- Summary artifacts now surface queued and blocked counts alongside approval and broker-readiness posture.
- `trade.js status` should agree with dashboard/summary surfaces on the split between `Open-runner first handoffs` and `Open-runner retries`.
- `runtime/overview/portfolio-overview.md` should surface the same posture across portfolios through its `First handoffs` and `Retries` columns.

## Diagnostic interpretation guide
- Use `trade.js preflight` as the decisive live-readiness answer.
- Use `trade.js authority` when you need to understand whether execution authority could permit action in principle.
- Use `trade.js config` to inspect the effective redacted broker/runtime config behind the current posture.
- Use `trade.js delivery` to confirm whether reporting or delivery posture needs operator attention.
- Use `run-health-check.js` when you want a synthesized health/reporting view rather than raw broker/readiness diagnostics.
- Use the summary/overview artifacts when you need cross-surface consistency checks, not just one CLI snapshot.
- If a dashboard or summary disagrees with these diagnostic surfaces, prefer the canonical command output and treat the rendered artifact as potentially stale.

## Rule
Keep runtime evidence local, structured, and short. Use Markdown for the operator view, JSONL for detail.


## Runtime evidence split

- `runtime/events/runtime-events.jsonl` and `runtime/execution-state.json` are ephemeral runtime state.
- `runtime/overview/*` and the portfolio summary/recovery artifacts are versioned operator evidence.
- The stage helper intentionally stages only the versioned evidence paths.
