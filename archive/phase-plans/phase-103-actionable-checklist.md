# Phase 103 — Actionable Checklist

## Canonical execution command surface
- [x] Inventory execution-related scripts and classify them as canonical / compat / debug / obsolete.
- [x] Define one canonical execution command family.
- [x] Add or refine a top-level operator entrypoint for readiness / approve / reject / stage / cancel / resync.
- [x] Ensure canonical commands have clear help/usage output.
- [x] Ensure canonical commands support machine-readable JSON where operationally useful.

## Documentation and deprecation
- [x] Document the canonical command surface in repo docs.
- [x] Mark obsolete scripts clearly.
- [x] Preserve compatibility where needed without ambiguity.

## Verification
- [x] Add focused tests for canonical command routing/output.
- [x] Run repo verification after changes.
- [x] Confirm no safety gates were widened.
- [x] Commit Phase 103 implementation.
- [x] Push Phase 103.
