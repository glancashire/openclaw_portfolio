# Phase 8 — Portfolio guided intake completion plan

## Goal
Complete the portfolio creation workflow by adding a guided question flow for unresolved required inputs, making draft-to-active setup clearer and more actionable without weakening the existing activation safeguards.

## Scope for this phase
- Inspect the current draft-state and next-questions workflow for remaining guided-intake gaps.
- Add clearer structured question prompts for missing or unresolved required portfolio inputs.
- Improve continuity between draft readiness, unanswered questions, and activation blockers.
- Add focused tests for guided question generation and draft-state continuity.
- Update progress docs when verified.

## Actionable checklist
- [x] Inspect current portfolio draft/intake workflow for remaining guided-flow gaps.
- [x] Add structured guided question generation for unresolved required inputs.
- [x] Tighten continuity between next-question output and activation-readiness blockers.
- [x] Improve operator-facing prompt clarity for draft completion.
- [x] Add focused tests for:
  - [x] required unanswered inputs generate guided prompts
  - [x] answered/settled inputs stop generating redundant prompts
  - [x] activation blockers and guided questions stay aligned
- [x] Run the targeted Phase 8 guided-intake test set.
- [x] If any test fails, iterate until green.
- [x] Run the broader verification bundle(s) affected by this phase.
- [x] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused guided-intake regression test(s)
- Existing portfolio-creation and broader verification scripts

## Verified outcomes
- Draft workflows now expose structured guided questions instead of only raw missing-field keys.
- Guided questions now stay aligned with activation blockers and disappear cleanly once the draft is answered.
- Operator-facing intake prompts now include concrete guidance and expected answer formats for common missing inputs.
