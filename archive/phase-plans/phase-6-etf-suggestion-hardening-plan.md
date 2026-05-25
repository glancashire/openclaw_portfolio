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
- [x] Inspect ETF shortlist and instrument proposal engines for remaining workflow gaps.
- [x] Add exclusion-aware shortlist filtering.
- [x] Add explicit shortlist scoring/rejection explanation helpers.
- [x] Improve shortlist output metadata for preferences and approval state.
- [x] Tighten approved-instrument row generation from shortlist output.
- [x] Add focused tests for:
  - [x] excluded instruments are filtered from suggestions
  - [x] shortlist reasons explain preference/ranking decisions
  - [x] approved rows respect shortlisted target splits
  - [x] already-approved instruments are surfaced clearly without bypassing exclusions
- [x] Run the targeted ETF workflow test set.
- [x] If any test fails, iterate until green.
- [x] Run the broader verification bundle(s) affected by this phase.
- [x] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused `scripts/test-etf-suggestion-hardening.js`
- Existing proposal/report/execution checks to ensure no regressions

## Verified outcomes
- Excluded instruments are now filtered out of shortlist suggestions and surfaced in explicit rejection output.
- Shortlist reasoning now shows issuer/currency/liquidity/TER preference contributions more clearly.
- Approved instruments remain visible in ranked shortlist output without bypassing exclusions.
- Approved-instrument row generation now stays aligned with shortlisted target splits.
