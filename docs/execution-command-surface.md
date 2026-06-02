# Execution Command Surface

This document defines the canonical operator command surface for execution workflows.
For reporting, dashboard, and email commands, see `docs/reporting-command-surface.md`.
For execution authority, automation limits, and live-execution safety boundaries, see `system-policy.md`.

## Canonical entrypoint

Use `node scripts/trade.js ...` as the primary operator command family.

### Canonical commands
- `trade preflight` — canonical live-readiness / Monday-execution truth surface
- `trade authority` — canonical effective-config / execution-authority truth surface
- `trade config` — canonical effective-config diagnostic surface with redacted broker configuration and execution authority context
- `trade delivery` — canonical delivery-posture diagnostic surface
- `trade reconcile-live` — canonical broker/live-state reconciliation surface that refreshes open-order truth, completed/fill evidence, and derived operator artifacts
- `trade health` — classify current portfolio execution health from broker, approvals, retry state, and delivery backlog
- `trade self-heal` — show a bounded dry-run remediation plan with safe next commands only
- `trade arm-open` — explicitly arm the next market-open execution window
- `trade disarm-open` — clear any armed market-open execution window
- `trade submit` — submit/stage approved orders via the market-open path
- `trade queue-open` — queue a row for the open runner
- `trade requeue-open` — requeue a blocked row for retry
- `trade cancel` — cancel open orders
- `trade status` — inspect open orders / queue state
- `trade history` — inspect recent executions
- `trade validate` — run ETF quality validation
- `trade propose` — generate a proposal surface

## Compatibility / legacy scripts

These remain callable for now but should not be treated as the primary operator surface:
- `scripts/check-live-readiness-preflight.js`
- `scripts/check-transmitted-live-readiness.js`
- `scripts/submit-orders-at-open.js`
- `scripts/approve-portfolio-trade.js`
- `scripts/reject-portfolio-trade.js`
- `scripts/cancel-portfolio-order.js`
- `scripts/resync-portfolio-orders.js`

## Obsolete scripts
- `scripts/execute-trades.js`
  - obsolete compatibility stub only
  - do not use for real operations

## Debug / diagnostic scripts
Broker-diagnostic probes live under `scripts/diagnostics/`. Thin wrappers may remain in `scripts/` for compatibility, but they are investigative tools, not canonical operator commands.

## Diagnostic guidance
Use the canonical diagnostics together when checking whether the system is truly ready for action:
- `trade preflight` answers whether live execution is currently safe/allowed
- `trade authority` answers whether execution authority could allow live action in principle under current portfolio/runtime conditions
- `trade config` answers what broker/runtime configuration is effectively loaded without exposing secrets
- `trade delivery` answers whether reporting/delivery posture needs operator attention

If these surfaces disagree with a dashboard or summary artifact, prefer the canonical command output and investigate the derived artifact drift.

## Safety rule
Canonicalization does not widen permissions. Live transmission remains blocked unless policy, readiness, approval state, and explicit arming all pass.
