# Phase W1 — Doc archive + rollup closing pass

**Goal:** Move completed stabilization plans and the closed post-MVP roadmap into `archive/`, update references, close Roll-up B and F items in `ROLLUP_OUTSTANDING_PLAN.md`.

## Objectives
1. Archive completed phase plans (S1–S5, stabilization master plan, post-mvp-roadmap) under `archive/`
2. Update `docs/operations/repo-map.md` to reflect the moves
3. Update `scripts/test-repo-root-cleanliness.js` if the phase-S* allowlist needs adjusting
4. Close Roll-up B and F items in `ROLLUP_OUTSTANDING_PLAN.md`
5. `npm test` green

## Risks / dependencies
- `test-repo-root-cleanliness.js` currently allows `phase-S*` in root. After moving them, the test still passes (it only fails on non-S phase files in root). Verify.
- `ROLLUP_OUTSTANDING_PLAN.md` references `stabilization-master-plan-2026-05-25.md` — update the link.
- `docs/operations/soak-readiness.md` references `phase-S*-plan.md` — update to `archive/` path.

## Actionable checklist
- [ ] `git mv` the 7 files into `archive/`:
  - `phase-S1-repo-truth-and-test-gates-plan.md`
  - `phase-S2-carry-over-bug-closeout-plan.md`
  - `phase-S3-cron-and-delivery-hardening-plan.md`
  - `phase-S4-runtime-and-doc-hygiene-plan.md`
  - `phase-S5-soak-prep-plan.md`
  - `stabilization-master-plan-2026-05-25.md`
  - `post-mvp-roadmap.md`
- [ ] Update `docs/operations/repo-map.md` — remove/update references to moved files
- [ ] Update `docs/operations/soak-readiness.md` — fix `phase-S*` path refer] Update `ROLLUP_OUTSTANDING_PLAN.md`:
  - Fix stabilization-master-plan link
  - Check off Roll-up B remaining items (archive decision made: move to archive/)
  - Check off Roll-up F remaining items (same decision)
- [ ] Grep for any other broken references to moved files
- [ ] Run `npm test` — verify green
- [ ] Commit + push

## Acceptance criteria
- Root .md count drops from 22 to 15
- `npm test` exit 0
- No broken links to archived files in canonical docs
- Roll-up B and F fully checked off
