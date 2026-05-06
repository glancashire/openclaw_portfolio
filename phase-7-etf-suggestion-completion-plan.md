# Phase 7 — ETF suggestion workflow completion plan

## Goal
Finish the ETF shortlist workflow by adding the remaining selection filters and tightening approval-gated shortlist application so Approved Instruments only update from explicitly approved suggestions.

## Scope for this phase
- Extend shortlist candidate evaluation with the remaining screening dimensions still open in the roadmap.
- Make shortlist output explain those filters clearly in both ranking reasons and rejection reasons.
- Tighten Approved Instruments application so unapproved suggestions cannot be promoted silently.
- Add focused tests for the new filters and approval gate behavior.
- Update progress docs when verified.

## Actionable checklist
- [ ] Inspect the current shortlist engine and approval/application flow for remaining Phase 7 gaps.
- [ ] Add shortlist filtering/scoring for:
  - [ ] geography alignment
  - [ ] exchange availability
  - [ ] fund size
  - [ ] domicile preference
  - [ ] distribution vs accumulation preference
  - [ ] broker availability
  - [ ] spread quality where available
- [ ] Tighten approval gating before applying shortlist output into Approved Instruments.
- [ ] Improve shortlist markdown/rejection output so the new filters are visible and reviewable.
- [ ] Add focused tests for:
  - [ ] remaining ETF filters affecting suggestions/rejections
  - [ ] approved-instrument application blocks unapproved shortlist rows
  - [ ] existing approved instruments still remain visible appropriately
- [ ] Run the targeted Phase 7 ETF completion test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader verification bundle(s) affected by this phase.
- [ ] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused Phase 7 completion regression test(s)
- Existing ETF shortlist and broader execution/report verification scripts
