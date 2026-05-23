# Phase 218 — stabilize resting state and leave-behind evidence

## Objectives
- Make verification and canonical evidence-generation paths converge to a stable resting state so operator-facing files stop churning when semantic content has not changed.
- Separate intentional leave-behind evidence from ephemeral runtime noise more cleanly in code and workflow.
- Leave the repo in a calm, inspectable state that can be left alone briefly while still gathering trustworthy usage evidence.

## Risks / dependencies
- Generated summaries, health artifacts, and overview surfaces are operator-facing outputs, so write suppression must not hide real state changes.
- Multiple generators currently stamp fresh timestamps and may write in dependency loops; fixing only one path may leave residual churn elsewhere.
- Verification must stay strict enough to catch regressions even if writes become conditional.

## Actionable checklist
- [ ] Trace the main evidence-writing paths touched by summary, health, overview, and dashboard regeneration.
- [ ] Add a shared conditional artifact writer / stable serialization helper where it reduces non-semantic rewrites safely.
- [ ] Preserve existing generated timestamps when regenerated content is otherwise identical, or avoid writes entirely on identical content.
- [ ] Add regression tests covering no-op rewrites and post-verification resting-state cleanliness.
- [ ] Refresh canonical evidence artifacts through the intended flows and classify any remaining dirty files into versioned evidence vs ephemeral runtime churn.
- [ ] Run focused tests, then full `node scripts/verify-repo.js`, confirm the repo remains clean except for explicitly ephemeral runtime files.

## Acceptance criteria
- Canonical verification/evidence generation no longer re-dirties versioned evidence files when semantic content is unchanged.
- Operator-facing summary/health/overview artifacts remain truthful and still update when content genuinely changes.
- Regression tests cover conditional/idempotent artifact writing behavior.
- Full repository verification passes and remaining dirty files are limited to intentional ephemeral runtime churn or explicitly documented exceptions.
