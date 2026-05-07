# Phase 33 — Guided onboarding / workflow uplift plan

## Goal
Turn the existing draft-question helpers into a clearer operator onboarding workflow by producing structured onboarding status/output, grouping remaining questions into actionable sections, surfacing completion progress and next-step guidance, and making the workflow easier to consume from CLI and future UI surfaces.

## Scope checklist
- [ ] Update roadmap/progress docs to record Phase 32 completion and Phase 33 as current focus
- [ ] Add a structured onboarding workflow summary builder for draft portfolios
- [ ] Group remaining questions by section so operators can work through onboarding in logical batches
- [ ] Add onboarding progress/completion metrics and explicit next-step guidance
- [ ] Extend CLI output for next-question discovery to expose workflow-ready onboarding status
- [ ] Keep activation-readiness and guided-question behavior backward-compatible for existing callers
- [ ] Add focused tests for grouped onboarding status, progress metrics, and CLI-compatible output shape
- [ ] Inspect one representative onboarding workflow output directly

## Implementation notes
- Reuse existing `guidedQuestions`, `activationReadiness`, and draft-state extraction instead of inventing a parallel intake model.
- Prefer additive structured output that future dashboard/UI/report surfaces can consume.
- Keep legacy question arrays available while layering richer workflow metadata on top.
- Make “what to do next” explicit even when readiness is blocked by multiple unanswered sections.

## Verification
- [ ] node scripts/test-portfolio-guided-intake.js
- [ ] node scripts/test-apply-portfolio-answers.js
- [ ] inspect `node scripts/next-portfolio-questions.js <portfolio.md>` output for a representative portfolio
- [ ] rerun any newly added onboarding/workflow-focused checks

## Exit criteria
Phase 33 is complete when onboarding status is grouped, progress-aware, next-step oriented, backward-compatible with current draft-state checks, and all focused verification passes.
