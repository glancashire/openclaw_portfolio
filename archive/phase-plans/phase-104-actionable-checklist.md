# Phase 104 — Actionable Checklist

## Readiness truth integration
- [x] Add a reusable reporting-facing summary derived from canonical live-readiness preflight.
- [x] Thread that summary into dashboard generation.
- [x] Add explicit dashboard section or fields for live readiness, arming, expiry, blockers, warnings, and next action.
- [x] Thread readiness status into overview board/index surfaces where appropriate.

## Truthfulness and consistency
- [x] Ensure current ETF portfolio derived output clearly shows not-ready state when blocked.
- [x] Avoid reimplementing readiness policy in reporting code; consume canonical preflight output instead.
- [x] Keep all live-readiness behavior fail-closed.

## Verification
- [x] Add focused dashboard/overview tests for readiness propagation.
- [x] Run new tests plus repo verification.
- [x] Iterate until all checks pass.
- [x] Commit Phase 104 implementation.
- [x] Push Phase 104.
