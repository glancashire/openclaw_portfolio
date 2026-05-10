# Phase 103 — Actionable Checklist

## Canonical execution command surface
- [ ] Inventory execution-related scripts and classify them as canonical / compat / debug / obsolete
- [ ] Define one canonical execution command family
- [ ] Add or refine a top-level operator entrypoint for readiness / approve / reject / stage / cancel / resync
- [ ] Ensure canonical commands have clear help/usage output
- [ ] Ensure canonical commands support machine-readable JSON where operationally useful

## Documentation and deprecation
- [ ] Document the canonical command surface in repo docs
- [ ] Mark obsolete scripts clearly
- [ ] Preserve compatibility where needed without ambiguity

## Verification
- [ ] Add focused tests for canonical command routing/output
- [ ] Run repo verification after changes
- [ ] Confirm no safety gates were widened
