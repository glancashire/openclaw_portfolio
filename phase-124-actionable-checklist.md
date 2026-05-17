# Phase 124 — Actionable Checklist

_Last updated: 2026-05-12 22:14 UTC_

## Objective
Stabilize IBKR native auth/readiness handshakes so canonical auth/readiness/authority surfaces stop disagreeing due to narrow `nextValidId` timing behavior.

## Checklist
- [x] Review `src/brokers/interactive-brokers/nativeClient.js` handshake success/failure events.
- [x] Review readiness and authority callers for repeated fresh-connection divergence.
- [x] Implement a shared native connection wait helper that accepts multiple safe success signals.
- [x] Preserve explicit timeout and real-error reporting without masking hard failures.
- [x] Reuse the helper across auth/relevant broker operations.
- [x] Add or extend regression tests for timeout handling and readiness/auth convergence behavior.
- [x] Run focused verification gates.
- [x] Iterate until all targeted tests pass.
- [x] Commit implementation.
- [x] Push.

## Verification gates
- `node tests/test-ibkr-readiness.js`
- `node scripts/test-interactive-brokers-auth.js`
- `node scripts/check-interactive-brokers-readiness.js portfolio/etf`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/trade.js preflight portfolio/etf --json` (if needed)
