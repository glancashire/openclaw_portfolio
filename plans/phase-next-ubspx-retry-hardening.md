# Phase plan — UBSPX retry hardening and execution-session reliability

## Goal
Finish the next implementation wave around the cancelled UBSPX replacement path by turning the recent fixes into a clean, tested, auditable phase sequence.

## Working rule for this phase series
Commit **source/tests only**. Do not include generated runtime artifacts, live portfolio state files, or transient logs in phase commits unless a phase explicitly targets those contracts.

## Phase sequence

### Phase 1 — Stabilize proposal and timing fixes
Scope:
- preserve the existing instrument-selection fix
- preserve target-gap cash deployment sizing
- preserve native order timing/session field forwarding
- preserve UBSPX-specific timing policy injection in execution path
- add/clean focused regression tests covering those behaviors

Checklist:
- [ ] Review changed source/test files and remove dead or misleading test artifacts
- [ ] Ensure proposal-distribution regression proves UBSPX gets the buy when EMUAA is overweight
- [ ] Ensure target-gap deployment regression proves asset-class proposals do not spend all cash when the target gap is smaller
- [ ] Ensure timing-field forwarding regression proves native client forwards outsideRth/goodAfterTime/goodTillDate
- [ ] Ensure execution timing-policy regression proves UBSPX/IBIS gets DAY + goodAfterTime + outsideRth=false defaults
- [ ] Run focused tests until green
- [ ] Commit phase 1
- [ ] Push phase 1

### Phase 2 — Reconciliation and audit-trail hardening
Scope:
- prevent misleading reconciliation when broker order ids are reused or exact order-id lookup fails
- ensure completed-order hint matching is scoped tightly enough to avoid contaminating unrelated historical rows
- improve tests around probable-cancelled reconciliation logic

Checklist:
- [ ] Inspect current reconcileOrderStatus / trade-row matching path
- [ ] Write failing regression for cross-row contamination / ambiguous hint matching
- [ ] Patch matching logic to require stronger symbol/instrument/quantity alignment
- [ ] Re-run targeted tests until green
- [ ] Commit phase 2
- [ ] Push phase 2

### Phase 3 — Session-aware retry ergonomics
Scope:
- make session-aware retry payload construction explicit and reusable instead of ad hoc
- keep live approval gates intact
- optionally expose a helper for staged next-session retry previews

Checklist:
- [ ] Write failing tests for reusable retry-order preparation helper/policy
- [ ] Refactor execution timing policy into a clearer helper surface if needed
- [ ] Verify dry-run staging still has no write side effects
- [ ] Re-run targeted tests until green
- [ ] Commit phase 3
- [ ] Push phase 3

## Verification standard
Each phase must:
1. start from a written failing or coverage-improving test set
2. iterate until tests pass
3. produce a source/tests-only commit
4. push before moving on
5. be summarized briefly in chat when complete

## Exclusions
- no blind live-order retransmission
- no committing runtime/, portfolio live-state artifacts, or local scratch files as part of these phase commits
- no weakening approval or transmitted-live safeguards
