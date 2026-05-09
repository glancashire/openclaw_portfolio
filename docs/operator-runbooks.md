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
- `node scripts/stage-portfolio-order.js portfolio/etf '<json>' stage`
- `node scripts/check-transmitted-live-readiness.js portfolio/etf '<json>'`
- `node scripts/resync-portfolio-orders.js portfolio/etf`

## What to check after action
- `trades.md`
- `history.md`
- `dashboard.md`
- `runtime/execution-state.json`
- `runtime/events/runtime-events.jsonl`

## Obsolete material
Old duplicate operator notes were folded into this file. If a runbook is no longer used, remove it instead of keeping multiple versions.
