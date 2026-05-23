# Phase 221 — stable evidence refresh and operator surface cleanup

## Objectives
- Refresh the operator-facing evidence surfaces so the latest stable state is captured cleanly and consistently.
- Reduce surprise churn by keeping the evidence generation paths deterministic and the operator surfaces aligned with the current repo state.
- Leave the repo in a calm, inspectable shape suitable for gathering usage evidence.

## Risks / dependencies
- The runtime will continue to emit ephemeral churn during verification; this must remain classified as expected noise.
- Evidence refresh can still reveal genuine regressions in reporting surfaces, so tests must stay strict.
- Any changes to summary/overview generation need to preserve the current contract for operator-facing artifacts.

## Actionable checklist
- [ ] Inspect the current dirty evidence set and determine which files are true leave-behind evidence versus ephemeral runtime noise.
- [ ] Regenerate the intended versioned evidence surfaces through their canonical generators.
- [ ] Add or adjust regression coverage if any evidence path still rewrites when its content is unchanged.
- [ ] Re-run the focused test set and full verification to confirm the stable state remains trustworthy.
- [ ] Commit and push the refreshed evidence and any small cleanup fixes.

## Acceptance criteria
- Versioned evidence files reflect the latest stable state and no longer show avoidable churn.
- Ephemeral runtime churn remains explicitly distinguishable from versioned evidence.
- Regression coverage passes and the repo can be left in a stable, evidence-backed state.
