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
- [x] Inspect the current shortlist engine and approval/application flow for remaining Phase 7 gaps.
- [x] Add shortlist filtering/scoring for:
  - [x] geography alignment
  - [x] exchange availability
  - [x] fund size
  - [x] domicile preference
  - [x] distribution vs accumulation preference
  - [x] broker availability
  - [x] spread quality where available
- [x] Tighten approval gating before applying shortlist output into Approved Instruments.
- [x] Improve shortlist markdown/rejection output so the new filters are visible and reviewable.
- [x] Add focused tests for:
  - [x] remaining ETF filters affecting suggestions/rejections
  - [x] approved-instrument application blocks unapproved shortlist rows
  - [x] existing approved instruments still remain visible appropriately
- [x] Run the targeted Phase 7 ETF completion test set.
- [x] If any test fails, iterate until green.
- [x] Run the broader verification bundle(s) affected by this phase.
- [x] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused Phase 7 completion regression test(s)
- Existing ETF shortlist and broader execution/report verification scripts

## Verified outcomes
- Shortlist filtering now covers geography, exchange, fund-size, domicile, distribution, broker-availability, and spread-quality dimensions.
- Shortlist markdown/rejection output now makes those filters visible for operator review.
- Applying shortlist output into Approved Instruments now requires explicit approval evidence instead of silently promoting unapproved rows.
- Existing approved instruments remain surfaced appropriately even when newer preference filters are stricter.
