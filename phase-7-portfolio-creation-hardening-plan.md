# Phase 7 — Portfolio creation workflow hardening plan

## Goal
Make draft portfolio creation and activation readiness more trustworthy by tightening completeness detection, ensuring required generated files are present, and making draft-to-active blockers explicit and testable.

## Scope for this phase
- Strengthen draft-state completeness detection in `portfolioDraftState.js`.
- Add a compact activation-readiness helper that checks required files and unresolved placeholders.
- Make missing generated-file / placeholder blockers explicit for draft portfolios.
- Add focused tests for complete draft detection, missing-file detection, and unresolved placeholder blocking.
- Update progress docs when verified.

## Actionable checklist
- [ ] Inspect current draft-state, next-question, and activation-check scripts for gaps.
- [ ] Extend draft-state helpers with explicit completeness/readiness metadata.
- [ ] Add required-file / placeholder detection for portfolio bootstrap outputs.
- [ ] Add a reusable activation-readiness helper for creation workflow checks.
- [ ] Add focused tests for:
  - [ ] complete draft reports ready state
  - [ ] missing generated file reports blocked state
  - [ ] unresolved placeholders report blocked state
  - [ ] next questions shrink appropriately after answers are applied
- [ ] Run the targeted portfolio-creation test set.
- [ ] If any test fails, iterate until green.
- [ ] Run the broader verification bundle(s) affected by this phase.
- [ ] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused `scripts/test-portfolio-creation-hardening.js`
- Existing answer-application and validation scripts
