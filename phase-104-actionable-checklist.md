# Phase 104 — Actionable Checklist

## Readiness truth integration
- [ ] Add a reusable reporting-facing summary derived from canonical live-readiness preflight.
- [ ] Thread that summary into dashboard generation.
- [ ] Add explicit dashboard section or fields for live readiness, arming, expiry, blockers, warnings, and next action.
- [ ] Thread readiness status into overview board/index surfaces where appropriate.

## Truthfulness and consistency
- [ ] Ensure current ETF portfolio derived output clearly shows not-ready state when blocked.
- [ ] Avoid reimplementing readiness policy in reporting code; consume canonical preflight output instead.
- [ ] Keep all live-readiness behavior fail-closed.

## Verification
- [ ] Add focused dashboard/overview tests for readiness propagation.
- [ ] Run new tests plus repo verification.
- [ ] Iterate until all checks pass.
- [ ] Commit Phase 104 implementation.
- [ ] Push Phase 104.
