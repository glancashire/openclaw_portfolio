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
- [x] Inspect current draft-state, next-question, and activation-check scripts for gaps.
- [x] Extend draft-state helpers with explicit completeness/readiness metadata.
- [x] Add required-file / placeholder detection for portfolio bootstrap outputs.
- [x] Add a reusable activation-readiness helper for creation workflow checks.
- [x] Add focused tests for:
  - [x] complete draft reports ready state
  - [x] missing generated file reports blocked state
  - [x] unresolved placeholders report blocked state
  - [x] next questions shrink appropriately after answers are applied
- [x] Run the targeted portfolio-creation test set.
- [x] If any test fails, iterate until green.
- [x] Run the broader verification bundle(s) affected by this phase.
- [x] Update roadmap/checklist/progress docs to reflect verified completion.
- [ ] Commit the phase.
- [ ] Push the phase.

## Intended verification
- New focused `scripts/test-portfolio-creation-hardening.js`
- Existing answer-application and validation scripts

## Verified outcomes
- Draft workflow now reports explicit required-file status and unresolved placeholder blockers.
- Activation readiness is reusable from both portfolio path and portfolio directory inputs.
- Next-question output and activation readiness now align after answers are applied.
- Existing active ETF portfolio passes the tightened readiness check cleanly.
