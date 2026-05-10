# Execution Command Surface

This document defines the canonical operator command surface for execution workflows.

## Canonical entrypoint

Use `node scripts/trade.js ...` as the primary operator command family.

### Canonical commands
- `trade preflight` — canonical live-readiness / Monday-execution truth surface
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
The `debug-native-*` and similar broker-diagnostic scripts are investigative tools, not canonical operator commands.

## Safety rule
Canonicalization does not widen permissions. Live transmission remains blocked unless policy, readiness, approval state, and explicit arming all pass.
