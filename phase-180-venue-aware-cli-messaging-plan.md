# Phase 180 Plan — Venue-Aware CLI Market Messaging and Readiness Surface Alignment

## Objectives
- Remove remaining generic `EBS` market-open messaging from trade CLI surfaces where instrument/venue-aware truth is now available.
- Align `scripts/trade.js` and `scripts/submit-orders-at-open.js` with the readiness/preflight venue diagnostics so operators see consistent next-open and venue-state guidance.
- Preserve safety and avoid accidental behavior changes to live submission gating.

## Current state analysis
- Phase 179A–179D completed canonical venue diagnostics, IBKR-hours evaluation, reference fallback warnings, and UBSPX replacement decision support.
- `src/execution/liveReadinessPreflight.js` now carries better venue-aware diagnostics, but CLI surfaces still emit hardcoded `EBS` next-open messages.
- The remaining work is mainly surface unification: operator-facing CLI messaging should reflect the same venue truth as readiness.

## Risks / dependencies
- CLI behavior may be covered by doc/surface tests that will need updates.
- We should avoid broad refactors in `trade.js`; this phase should stay narrowly scoped to messaging/source-of-truth alignment.
- The repo remains dirty with unrelated live/runtime artifacts, so commits must stay surgical.

## Actionable checklist
- [ ] Add a reusable helper for venue-aware market-open messaging sourced from executable-row diagnostics.
- [ ] Patch `scripts/trade.js` and `scripts/submit-orders-at-open.js` to use that helper instead of hardcoded `EBS` next-open text where applicable.
- [ ] Add tests for:
  - venue-aware next-open messaging
  - no hardcoded `EBS` fallback in those operator-facing surfaces when instrument venue is known
  - regression coverage for generic fallback when no instrument venue is available
- [ ] Run targeted tests until green.
- [ ] Run broader execution verification and repo verification before phase close.

## Acceptance criteria
- CLI/operator-facing market-open messages use venue-aware truth when executable rows imply a primary venue.
- Generic fallback remains available when no better venue signal exists.
- Tests pass and the broader verification gates remain green.
