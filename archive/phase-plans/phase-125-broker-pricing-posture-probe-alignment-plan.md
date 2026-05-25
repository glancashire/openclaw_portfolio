# Phase 125 — Broker Pricing Posture Probe Alignment Plan

_Last updated: 2026-05-11 07:35 UTC_

## Goal

Make Interactive Brokers readiness classify pricing posture using portfolio-relevant, broker-realistic probes instead of a brittle generic sentinel that can return false uncertainty.

## Why this phase exists

Phase 124 stabilized the native auth handshake and made readiness/authority surfaces converge more safely. But readiness still reports `marketDataMode: unknown` in the current environment, and the current probe path is likely the cause.

Observed evidence:
- readiness uses `searchContracts('IEF')` as its market-data probe seed,
- the current native search path returned zero ETF results for `IEF`,
- live workflow evidence already shows executable portfolio instruments (EMUAA / UBSSLI) are better representatives of real broker-backed pricing posture.

## Scope

1. Replace or augment the generic `IEF` probe with portfolio-relevant probe candidates.
2. Prefer explicit approved/executable portfolio instruments when available.
3. Distinguish these states cleanly:
   - live/realtime pricing available
   - delayed-only pricing available
   - authenticated but no usable probe instrument/quote posture
   - auth/connectivity failure
4. Add focused tests for probe selection / readiness classification.
5. Verify canonical readiness and authority surfaces again.

## Non-goals

- No entitlement bypass.
- No weakening of delayed-only/live safety gates.
- No order submission changes.
- No changes to approval or arm-state controls.

## Actionable checklist

- [ ] Inspect current readiness probe selection logic.
- [ ] Inspect available portfolio-derived instrument identifiers for better probes.
- [ ] Implement portfolio-relevant probe candidate selection.
- [ ] Preserve safe degraded classification when no usable price posture exists.
- [ ] Add/update focused tests.
- [ ] Run focused verification commands and iterate until passing.
- [ ] Commit the plan.
- [ ] Commit the implementation once verified.
- [ ] Push the resulting commits.

## Verification gates

- `node tests/test-ibkr-readiness.js`
- `node scripts/check-interactive-brokers-readiness.js portfolio/etf`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/trade.js preflight portfolio/etf --json` (if responsive)

## Done criteria

This phase is complete when readiness uses a more truthful probe path and canonical surfaces reflect pricing posture based on portfolio-relevant broker behavior rather than a weak generic sentinel.
