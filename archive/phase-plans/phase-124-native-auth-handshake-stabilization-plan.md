# Phase 124 — Native Auth Handshake Stabilization Plan

_Last updated: 2026-05-11 07:31 UTC_

## Goal

Stabilize Interactive Brokers native-socket authentication/readiness probing so canonical surfaces stop flaking on `Timed out waiting for nextValidId` when the gateway is reachable and otherwise healthy.

## Why this phase matters

Phase 123 restored the native gateway, aligned writable/live gating, and got canonical preflight to a passing state. But one material operational risk remains: fresh auth/readiness probes can intermittently fail with `native_error` / `Timed out waiting for nextValidId` even when other canonical surfaces pass.

That creates dangerous ambiguity immediately before live execution.

## Current observed problem

- `src/brokers/interactive-brokers/nativeClient.js` treats `nextValidId` as the sole connection-success event.
- `withApi()` opens a fresh connection for each broker operation.
- `readiness.js` authenticates, then opens more fresh connections for contract search and market data probing.
- `executionAuthority.js` independently re-runs readiness.
- As a result, readiness/auth/authority can disagree transiently and a slow handshake on any one of those fresh sessions becomes a false `native_error`.

## Scope

1. Audit the native handshake logic and identify safer success signals / timeout behavior.
2. Make native auth/connect probing more tolerant without masking real failures.
3. Reduce unnecessary repeated fresh-probe divergence across auth/readiness surfaces where possible.
4. Add focused regression tests for readiness summarization and native auth timeout handling.
5. Verify the canonical command/test surfaces.

## Non-goals

- No widening of execution permissions.
- No silent bypass of broker readiness failures.
- No claim that delayed-only pricing is live-ready.
- No change to the user approval / arming / transmitted-live safety model.

## Actionable checklist

- [ ] Inspect native client handshake and event usage.
- [ ] Add a more stable native connection wait helper with explicit timeout/error handling.
- [ ] Use the shared helper across native operations.
- [ ] Reduce false-negative auth failures caused by one narrow success event.
- [ ] Add/extend tests covering handshake timeout behavior and readiness summarization.
- [ ] Run focused verification commands and iterate until they pass.
- [ ] Commit the plan.
- [ ] Commit the implementation once verification passes.
- [ ] Push the resulting commits.

## Verification gates

- `node tests/test-ibkr-readiness.js`
- `node scripts/test-interactive-brokers-auth.js`
- `node scripts/check-interactive-brokers-readiness.js portfolio/etf`
- `node scripts/trade.js authority portfolio/etf --json`
- If needed: `node scripts/trade.js preflight portfolio/etf --json`

## Done criteria

This phase is complete when:
- native auth probing is materially less flaky under the current restored gateway session,
- readiness/auth/authority surfaces converge more reliably,
- focused verification passes,
- changes are committed and pushed.
