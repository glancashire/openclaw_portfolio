# Phase 124 — Actionable Checklist

_Last updated: 2026-05-12 22:14 UTC_

## Objective
Stabilize IBKR native auth/readiness handshakes so canonical auth/readiness/authority surfaces stop disagreeing due to narrow `nextValidId` timing behavior.

## Checklist
- [ ] Review `src/brokers/interactive-brokers/nativeClient.js` handshake success/failure events.
- [ ] Review readiness and authority callers for repeated fresh-connection divergence.
- [ ] Implement a shared native connection wait helper that accepts multiple safe success signals.
- [ ] Preserve explicit timeout and real-error reporting without masking hard failures.
- [ ] Reuse the helper across auth/relevant broker operations.
- [ ] Add or extend regression tests for timeout handling and readiness/auth convergence behavior.
- [ ] Run focused verification gates.
- [ ] Iterate until all targeted tests pass.
- [ ] Commit implementation.
- [ ] Push.

## Verification gates
- `node tests/test-ibkr-readiness.js`
- `node scripts/test-interactive-brokers-auth.js`
- `node scripts/check-interactive-brokers-readiness.js portfolio/etf`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/trade.js preflight portfolio/etf --json` (if needed)
