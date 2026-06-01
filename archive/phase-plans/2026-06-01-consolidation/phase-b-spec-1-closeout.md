# Phase B plan — Spec §1 engineering closeout

## Objectives
- Decide and encode the engineering-scope closeout status for Spec §1.
- Update canonical status/progress surfaces so they consistently reflect that Spec §1 implementation is complete.
- Keep operational blockers and decision-only lanes visible without mislabeling them as unfinished core engineering.

## Risks / dependencies
- Risk of overstating closure if a canonical doc still depends on non-engineering criteria.
- Must preserve the distinction between engineering completion and operational readiness (especially native IBKR login/2FA dependence).
- Need to avoid touching generated artifacts or Graham-owned WIP.

## Actionable checklist
- [ ] Inspect the remaining canonical spec/progress surfaces for §1 wording.
- [ ] Update those surfaces to mark Spec §1 complete for engineering scope.
- [ ] Explicitly call out the remaining operational/decision lanes outside §1 core implementation.
- [ ] Run focused verification for touched docs/contracts.
- [ ] Commit and push the closeout.

## Acceptance criteria
- [ ] Canonical status docs no longer describe Spec §1 engineering as partially implemented.
- [ ] Remaining work is described as operational, infrastructural, or decision-only where that is the real truth.
- [ ] Repo-level doc/tests affected by the change pass cleanly.
