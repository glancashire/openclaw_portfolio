# Phase 6 — ETF suggestion workflow hardening plan

## Goal
Make ETF shortlist and instrument-proposal output more trustworthy by honoring exclusions and preferences more explicitly, improving rejection/ranking explanations, and tightening the connection between shortlist output and approved-instrument generation.

## Scope for this phase
- Parse excluded instruments into shortlist selection so banned items do not surface as viable recommendations.
- Strengthen shortlist ranking explanations and rejection reasons for near-miss candidates.
- Make shortlist output reflect CHF-first / issuer preference handling more clearly.
- Tighten approved-instrument row generation so selected rows stay aligned with shortlist target splits.
- Add focused tests for shortlist filtering, rationale quality, and approved-row generation.
- Update progress docs when verified.

## Actionable checklist
- [ ] Inspect ETF shortlist and instrument proposal engines for remaining workflow gaps.
- [ ] Add exclusion-aware shortlist filtering.
- [ ] Add explicit shortlist scoring/rejection explanation helpers.
- [ ] Improve shortlist output metadata for preferences and approval state.
- [ ] Tighten approved-instrument row generation from shortlist output.
- [ ] Add focused tests for:
  - [ ] excluded instruments are filtered from suggestions
  - [ ] shortlist reasons explain preference/ranking decisions
  - [ ] approved rows respect shortlisted target splits
  - [ ] already-approved instruments are surfaced clearly without bypassing exclusions
- [ ] Run the targeted ETF workflow test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader verification bundle(s) affected by this phase.
- [ ] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused `scripts/test-etf-suggestion-hardening.js`
- Existing proposal/report/execution checks to ensure no regressions
