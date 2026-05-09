# Observability

## What exists
- `runtime/events/runtime-events.jsonl` for structured runtime evidence
- `runtime/execution-state.json` for broker pause state
- portfolio dashboards and history files for operator-facing state

## Typical checks
- `node scripts/show-runtime-events.js --portfolio etf`
- `node scripts/check-risk-observability.js portfolio/etf`
- `node scripts/check-safety-controls.js portfolio/etf`

## Rule
Keep runtime evidence local, structured, and short. Use Markdown for the operator view, JSONL for detail.
