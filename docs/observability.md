# Observability

## What exists
- `runtime/events/runtime-events.jsonl` for structured runtime evidence
- `runtime/execution-state.json` for broker pause state
- portfolio dashboards and history files for operator-facing state

## Typical checks
- `node scripts/show-runtime-events.js --portfolio etf`
- `node scripts/check-risk-observability.js portfolio/etf`
- `node scripts/check-safety-controls.js portfolio/etf`
- `node scripts/check-interactive-brokers-readiness.js portfolio/etf`

## Readiness interpretation
- `reason: ready` means broker connectivity plus live/realtime pricing are available.
- `reason: delayed_data_only` means connectivity is up but pricing is delayed-only and execution posture remains degraded/dry-run only.
- `fallbackRequired: true` means operator-facing dashboards and runbooks should treat the broker path as degraded, even if pricing fallback is usable.

## Rule
Keep runtime evidence local, structured, and short. Use Markdown for the operator view, JSONL for detail.
