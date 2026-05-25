# Phase 125 — Actionable Checklist

_Last updated: 2026-05-12 22:21 UTC_

## Objective
Align IBKR pricing-posture readiness probes with portfolio-relevant instruments so readiness reflects real executable/approved instrument behavior instead of a brittle generic sentinel.

## Checklist
- [x] Review readiness probe-candidate selection and current fallback ordering.
- [x] Confirm whether generic fallback probes still dominate or obscure portfolio truth.
- [x] Prefer executable trade rows first, then approved instruments, then generic fallbacks.
- [x] Preserve clear classification for live/realtime, delayed-only, unpriced, and auth/connectivity failure states.
- [x] Add/extend focused tests for probe ordering and readiness summarization.
- [x] Run focused verification gates.
- [x] Iterate until all targeted tests pass.
- [x] Commit implementation.
- [x] Push.

## Verification gates
- `node tests/test-ibkr-readiness.js`
- `node scripts/check-interactive-brokers-readiness.js portfolio/etf`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/trade.js preflight portfolio/etf --json` (if responsive)
