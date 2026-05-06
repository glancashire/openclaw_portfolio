# Observability and runtime evidence

This repo now keeps a local structured runtime event trail for risk and execution-policy blockers.

## Where to look
- Runtime event log: `runtime/events/runtime-events.jsonl`
- Broker error pause state: `runtime/execution-state.json`
- Portfolio-facing summaries: `portfolio/<name>/dashboard.md` and generated reports
- Safety/risk CLI diagnostics: `node scripts/check-safety-controls.js portfolio/<name>`
- Combined risk/observability CLI: `node scripts/check-risk-observability.js portfolio/<name>`
- Recent event inspection: `node scripts/show-runtime-events.js --portfolio <name>`

## Runtime event schema
Each JSONL record uses a stable operator-facing shape:
- `timestamp`
- `level`
- `category`
- `action`
- `portfolio`
- `mode`
- `status`
- `summary`
- `details`

This is intentionally local-only and append-only so operators can inspect recent failures without relying only on Markdown snapshots.

## What gets recorded now
- safety/risk control blockers
- execution-policy blocked states, including transmitted-live blockers
- blocked cancel attempts under unsafe/degraded conditions

## Common diagnosis flows

### Broker degradation or repeated broker failures
1. Inspect `runtime/execution-state.json`.
2. Run `node scripts/show-runtime-events.js --portfolio etf --level warn`.
3. Run `node scripts/check-risk-observability.js portfolio/etf`.
4. Resync open orders only after broker readiness is healthy again.

### Stale data or blocked trading state
1. Run `node scripts/check-safety-controls.js portfolio/etf`.
2. Inspect the diagnostics JSON for pricing source, observed holding weight, and risk-limit metadata.
3. Check `dashboard.md` for risk diagnostics and observability summary.
4. Do not bypass the blocker; refresh holdings/pricing or resolve the underlying portfolio issue.

### Transmitted-live blocked path
1. Run `node scripts/check-transmitted-live-readiness.js ...` with the intended order payload.
2. Review the blocker list and matching runtime event entries.
3. Confirm execution mode, explicit approval, broker readiness, and acknowledgement string before any real broker write.

## Safe failure-drill coverage
Focused local-only tests cover:
- risk/safety blocker event emission
- transmitted-live gate failures and success path checks
- stale pricing / simulated pricing / unresolved approval blockers

## Limits
- This is local observability, not centralized remote telemetry.
- Runtime events intentionally avoid secret material; keep it that way.
- Markdown remains the operator surface of record, but runtime JSONL now preserves richer near-real-time evidence.
