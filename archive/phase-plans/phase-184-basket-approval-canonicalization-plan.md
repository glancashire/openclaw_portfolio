# Phase 184 — Basket Approval Canonicalization Plan

## Objective
Make the basket-based workflow the canonical approval-ready path for live ETF execution so the operator approves one bounded basket with per-leg price bands instead of babysitting row-level `trades.md` state.

## Current state
- Basket proposal, approval, reapproval, and execution runner modules exist.
- Live readiness and summary surfaces still primarily treat `trades.md` row approvals as the source of truth.
- Today’s rebalance work exposed the mismatch: a valid basket can exist while readiness still reports `no approved rows`.

## Risks / dependencies
- Safety gates for live broker execution must remain explicit.
- Existing repo state is dirty; commits must be intentionally scoped.
- Summary/reporting surfaces may assume legacy row-based approval counts.
- Must avoid silently bypassing stale proposal / first-purchase / sales protections.

## Action checklist
- [ ] Inspect current readiness, authority, summary, and reconciliation flows for row-vs-basket assumptions.
- [ ] Define canonical precedence rules between approved baskets and `trades.md` rows.
- [ ] Add or update tests for basket-aware readiness and approval reporting.
- [ ] Implement readiness/summary changes so an approved executable basket is recognized as approval-ready.
- [ ] Verify no regressions in legacy row-based execution flow.
- [ ] Document the updated operator flow in plan/progress artifacts.

## Acceptance criteria
- A valid approved basket causes readiness surfaces to reflect approval-ready state without requiring duplicate row approvals.
- Legacy row-based behavior still works when no approved basket exists.
- Summary/recovery/reporting surfaces explain the active approval source clearly.
- Focused basket + readiness tests pass, and no regressions appear in relevant execution tests.

## Verification gates
- Targeted basket proposal / approval / runner / reapproval tests
- Live readiness / summary tests covering both basket and row-based approvals
- Direct inspection of generated approval artifacts and readiness JSON
