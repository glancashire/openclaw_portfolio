# Phase 135 — Native Live Order Reconciliation and Contract Truth

## Goal
Stabilize the first real native transmitted-live submission aftermath by reconciling broker-visible order state, fixing contract identity mismatches that break live placement, and ensuring operator-facing status surfaces reflect real native order outcomes.

## Problem statement
Phase 134 removed the skill-only placement blocker and proved native transmitted-live submission can now reach broker placement. The first live attempt exposed two concrete follow-on problems:

1. `UBSSLI` failed because broker contract identity and portfolio symbol truth diverged (`requested symbol UBSSLI, in contract CHSPI`).
2. Order/status/fill inspection is partially degraded by downstream runtime/tooling assumptions, obscuring authoritative operator truth after live placement.
3. `SPYL` acknowledged but surfaced as `Inactive`, which needs explicit operator-facing explanation and/or state normalization.

## Constraints
- Preserve safety and auditability for live orders.
- Do not silently resubmit or duplicate live orders.
- Prefer conid/broker contract truth over cosmetic ticker aliases when the two disagree.
- Keep canonical operator surfaces (`status`, `authority`, `preflight`, submit logs/state) aligned.
- Avoid broad refactors; patch the narrowest correct truth path first.

## Actionable checklist
- [ ] Trace the exact live-placement contract payload for SPYL, EMUAA, and UBSSLI.
- [ ] Fix native contract normalization so broker contract identity wins over alias drift during live placement.
- [ ] Surface broker-native post-submit states (`Submitted`, `Inactive`, placement failure) clearly in operator state and logs.
- [ ] Verify status/fill inspection path and isolate any non-repo environment blocker separately from code bugs.
- [ ] Add/update focused regression coverage for contract normalization and live-status reconciliation.
- [ ] Re-run canonical status/submit surfaces.
- [ ] Commit and push.
