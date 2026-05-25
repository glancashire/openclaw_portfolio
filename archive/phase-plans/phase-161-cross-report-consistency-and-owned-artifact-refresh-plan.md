# Phase 161 — Cross-Report Consistency and Owned Artifact Refresh Plan

## Objectives
- Apply a final consistency pass across investor-facing report surfaces completed in phases 157–160.
- Align top-level wording and section framing where it improves readability without breaking stable downstream contracts.
- Refresh only the generated artifacts that are clearly owned by the redesigned investor-facing reporting surfaces.
- Keep plain-text fallbacks dependable and avoid unnecessary churn in unrelated operational artifacts.

## Risks / Dependencies
- Cross-report wording changes can cause broad snapshot/test drift if applied too aggressively.
- Some report surfaces serve both operator and investor audiences; consistency should not erase useful operational distinctions.
- Generated artifacts often include broader runtime state and must only be committed when they clearly reflect the finished phase scope.
- Existing tests may rely on specific legacy phrases such as `Next action:` in text outputs.

## Actionable Checklist
- [ ] Audit portfolio email, fill notification email, health report, and summary artifact/report outputs for heading/callout inconsistencies.
- [ ] Add or update tests that pin the desired shared framing across HTML/text surfaces.
- [ ] Implement the smallest consistency changes that improve readability while preserving important backward-compatible phrases.
- [ ] Regenerate owned artifacts and inspect which files are phase-owned vs broader runtime churn.
- [ ] Run focused reporting tests until green.
- [ ] Run full `npm test`, clean unrelated churn, and commit/push the finished phase.

## Acceptance Criteria
- Investor-facing reports use a more coherent set of headings/callouts across portfolio, fill, and health surfaces.
- Text fallbacks remain readable and backward-compatible where existing contracts depend on legacy phrases.
- Only phase-owned generated artifacts are included in the final commit, if any.
- Focused reporting tests pass, followed by a successful full `npm test` run with no regressions.
