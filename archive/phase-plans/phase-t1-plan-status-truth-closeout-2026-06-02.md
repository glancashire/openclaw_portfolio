# Phase T1 — Plan/Status Truth Closeout

Date: 2026-06-02
Status: complete
Completed: 2026-06-02

## Objectives
- Restore `CURRENT_PLAN.md` as the actual living plan/control file used by repo surfaces.
- Close the remaining Phase 4B documentation gap with a canonical human-facing test governance entry point.
- Reconcile stale `active` / `planned` phase-plan statuses with the code and docs already shipped for Phase 4B, Phase 7B, Phase O1, and the fill-email work.
- Add lightweight regression coverage so plan/doc truth does not drift silently again.

## Risks / dependencies
- `CURRENT_PLAN.md` is consumed by `src/reporting/openPhasesCard.js`; the replacement must preserve its parseable structure.
- A new `scripts/test-*.js` file will require manifest regeneration in `docs/operations/test-manifest.json` and `docs/operations/test-coverage-by-domain.json`.
- The repo is dirty with generated artifacts; only phase-related files should be staged for this closeout.
- This phase should describe reality, not rewrite history or re-open already-shipped implementation lanes.

## Actionable checklist
- [ ] Rewrite `CURRENT_PLAN.md` into the expected living-plan format with a single active closeout phase.
- [ ] Add `docs/test-governance.md` as the canonical human-facing governance entry point, cross-linking the existing lane/policy artifacts.
- [ ] Add a focused regression test that asserts the governance doc and `CURRENT_PLAN.md` contain the expected control/truth hooks.
- [ ] Regenerate discovered-test artifacts if the new test changes manifest/domain-summary outputs.
- [ ] Mark stale phase-plan statuses complete/superseded where repo evidence shows the work already landed.
- [ ] Run focused tests for open-phases parsing, discovery policy, manifest shape, and the new governance/doc truth checks.
- [ ] Run the safe lane to ensure no regressions.
- [ ] Commit completed work and push.

## Acceptance criteria
- `CURRENT_PLAN.md` is again a parseable living plan with a visual roadmap and one current phase.
- `docs/test-governance.md` exists and points at the real lane/policy/manifest sources.
- Active/planned phase docs no longer claim unfinished work that the shipped repo state already satisfies.
- Tests cover the new governance/doc truth surfaces and pass.
- Safe-lane verification passes after the closeout.
