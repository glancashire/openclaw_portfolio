# Phase 126 — Actionable Checklist

_Last updated: 2026-05-12 22:39 UTC_

## Objective
Make approved-but-non-executable trade rows explicit and consistently explained across preflight, authority-adjacent operator surfaces, and market-open dry-run behavior.

## Checklist
- [ ] Inspect executable-row derivation and current blocked/non-executable trade-state semantics.
- [ ] Inspect preflight and market-open dry-run outputs for missing operator-facing reason detail.
- [ ] Define one normalized reason contract for approved-but-non-executable rows.
- [ ] Surface that reason in canonical preflight outputs.
- [ ] Keep market-open dry-run reasoning aligned with the same truth.
- [ ] Add/extend focused regression tests.
- [ ] Run verification gates.
- [ ] Iterate until all targeted tests pass.
- [ ] Commit implementation.
- [ ] Push.

## Verification gates
- `node tests/test-ibkr-readiness.js`
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/trade.js authority portfolio/etf --json`
- `node scripts/submit-orders-at-open.js portfolio/etf --dry-run`
- focused regression tests for executable-row reason reporting
