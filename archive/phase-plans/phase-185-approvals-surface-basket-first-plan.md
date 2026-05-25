# Phase 185 — Approvals Surface Basket-First Plan

## Objective
Make the operator-facing approvals queue and overview surfaces present the approved basket as the primary approval item when one exists, instead of leading with stale row-level proposal noise.

## Risks / dependencies
- Must not hide legacy row proposals entirely; they still matter when no basket exists.
- Summary/reporting tests are broad; changes can ripple into multi-portfolio overview expectations.
- Need to preserve current safety gates and avoid implying execution is automatic.

## Actionable checklist
- [ ] Update approvals queue generation to emit a basket-first item when an approved basket exists.
- [ ] Keep legacy row-based approval items as secondary context.
- [ ] Update markdown/HTML wording so basket approval is explained clearly.
- [ ] Add regression tests for basket-first queue ordering and text.
- [ ] Run the structured summary and overview tests to confirm no regressions.
- [ ] Regenerate the overview artifacts and verify the queue reflects the basket.

## Acceptance criteria
- The approvals queue shows the approved basket as rank 1 when present.
- Row-level pending approvals remain visible as secondary/legacy context.
- Existing summary/overview tests continue to pass.
- Generated overview artifacts match the new basket-first behavior.
