# Phase 144 — Submit Root-Cause Recovery and Swiss Contract Stabilization

## Goal
Fix the concrete root causes behind the approved-order non-execution outcomes so the operator surfaces and submit path reflect reality:
- SPYL / cancelled path: submit-time contract/order lifecycle stability and `Inactive`/cancelled reconciliation truth.
- UBSSLI / blocked path: reference-price selection and smart-limit fallback resilience for Swiss ETFs.

## Scope
1. Harden native IBKR contract construction for Swiss-listed approved instruments.
2. Preserve truthful lifecycle mapping for `Inactive` / probable cancelled outcomes.
3. Improve quote/reference extraction so safe close-based pricing is accepted when live/delayed fields are sparse.
4. Add/adjust targeted tests for the above.
5. Verify the market-open submit path still stays conservative and auditable.

## Non-goals
- No broad strategy changes.
- No widening of live permissions.
- No silent submission bypasses.

## Verification
- Targeted JS tests for contract normalization, inactive reconciliation, and quote fallback.
- Dry-run market-open submit check for `portfolio/etf`.
- Confirm no regression in transmitted-live gating.
