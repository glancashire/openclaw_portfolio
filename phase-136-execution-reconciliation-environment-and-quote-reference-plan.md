# Phase 136 — Execution Reconciliation Environment and Quote Reference Stability

## Goal
Restore reliable post-submit order/fill reconciliation and eliminate the remaining quote-reference instability that now blocks fresh live submission after Phase 135 removed the native contract-parameter conflict.

## Problem statement
After Phase 135:
- the prior `UBSSLI` contract conflict (`UBSSLI` vs `CHSPI`) no longer appears,
- but status/fill inspection still degrades because the skill execution/completed-order path crashes on missing Python `tzdata` when decoding `US/Eastern`,
- and the current live submit path is now blocked earlier by `pricing_reference_unavailable` on UBSSLI.

## Constraints
- Preserve live-order auditability and do not fabricate fill state.
- Prefer deterministic broker/native truth over brittle downstream parsing.
- Separate environment/tooling failures from repo logic failures.
- Keep fixes tight and phase-scoped.

## Actionable checklist
- [ ] Trace the execution/completed-order skill path to the exact timezone decoding failure and choose the narrowest fix.
- [ ] Fix or harden the reconciliation path so missing tzdata does not destroy order/fill observability.
- [ ] Trace UBSSLI quote/reference construction and determine whether the issue is parser loss, fallback loss, or broker snapshot shape drift.
- [ ] Patch quote/reference handling so safe smart-limit construction works when broker data is sufficient.
- [ ] Add/update focused tests for reconciliation hardening and quote-reference stability.
- [ ] Re-run canonical status/submit surfaces.
- [ ] Commit and push.
