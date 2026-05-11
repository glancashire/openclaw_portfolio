# Phase 128 — Blocked Row Recovery and Re-Arm Recovery Flow

## Goal
Provide a canonical, auditable recovery path for approved rows that were previously blocked during market-open execution, and ensure the operator-facing surfaces cleanly distinguish between expired arm state and stale/retriable blocked rows.

## Why this phase exists
Phase 127 fixed quote parsing and corrected UBSSLI contract drift, but the portfolio still remains non-executable because:
1. the live arm window has expired, and
2. approved rows that were blocked during earlier market-open attempts remain excluded until explicitly requeued.

Right now, the system is safe but operationally sticky. We need a clean recovery path that preserves auditability and does not silently clear prior block history.

## Scope
- Inspect current requeue / blocked-row recovery surfaces.
- Define the canonical operator-truth contract for retriable blocked rows.
- Improve CLI/operator surfaces so recovery actions are explicit and auditable.
- Verify that requeued rows become executable again when quotes are now usable.
- Preserve prior failure reasons in audit history instead of erasing them silently.

## Non-goals
- Do not auto-submit live orders.
- Do not silently clear approval or block history without a visible audit trail.
- Do not weaken live-execution safety gates.

## Actionable checklist
- [ ] Trace current blocked-row recovery flow in `trade.js` and `tradeState.js`.
- [ ] Inspect whether current requeue behavior preserves enough audit detail.
- [ ] Tighten the recovery contract for stale blocked approved rows if needed.
- [ ] Add or extend focused tests for blocked-row recovery and post-requeue executability.
- [ ] Re-arm the ETF portfolio for the next intended open window using the canonical CLI.
- [ ] Requeue the retriable approved ETF buy rows using the canonical CLI/path.
- [ ] Verify canonical preflight reflects recovered executable rows and explicit remaining blockers, if any.
- [ ] Verify market-open dry-run reflects the same recovered truth.
- [ ] Iterate until the targeted checks pass.
- [ ] Commit Phase 128 plan + implementation.
- [ ] Push Phase 128.

## Verification gates
- focused recovery/requeue tests
- `node scripts/trade.js arm-open portfolio/etf --hours 3`
- canonical row requeue commands for retriable approved rows
- `node scripts/trade.js preflight portfolio/etf --json`
- `node scripts/submit-orders-at-open.js portfolio/etf --dry-run`
- `node scripts/trade.js authority portfolio/etf --json`

## Exit criteria
- Recovered rows use an explicit, auditable path back into executable eligibility.
- Canonical preflight/authority/dry-run agree on the recovered state.
- Remaining blocked rows, if any, still retain precise reasons and next actions.
