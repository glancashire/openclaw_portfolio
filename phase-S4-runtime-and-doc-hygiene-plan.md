# Phase S4 — Runtime & doc hygiene

**Goal:** Reduce noise so usage evidence (the goal of the soak) doesn't drown in stale phase plans, superseded artifacts, and dead reference docs. Make it obvious what is current vs historical, and prune unmistakably-superseded runtime state under existing retention rules.

## Objectives
1. Archive (move, do not delete) historical phase plans out of the repo root
2. Banner anything that survives in the root as either `[CURRENT]` or `[HISTORICAL]`
3. Run `cleanup-runtime-artifacts.js` with the documented retention (no scope changes; just exercise the safe path)
4. Audit `MEMORY.md` and `TOOLS.md` for outdated guidance; freshen pointers
5. Land one entry-point map (`docs/operations/repo-map.md`) describing what every top-level file/dir is for, so we don't relapse

## Risks / dependencies
- The pre-commit hook and other tools may reference phase plans by relative path — `git grep` for references before moving anything
- `superpowers-openclaw` workflow says we should keep plans accessible for audit; archive ≠ delete
- Cleanup script is conservative by design; respect it
- Don't touch `runtime/` files that are actively read by jobs (basket-proposals, market-calendar, execution-state, etc.)

## Actionable checklist

### Sub-phase A — Doc archive
- [ ] Create `archive/phase-plans/` with a README explaining the move
- [ ] `git mv` every `phase-NNN-*.md` and `phase-N-*.md` plan in the repo root into `archive/phase-plans/`
- [ ] Keep in root: the active stabilization plans (`phase-S1`..`phase-S5`), `stabilization-master-plan-*`, all SPEC_* / PROGRESS_* / ROLLUP_* and uppercase rules files (AGENTS, SOUL, USER, etc.)
- [ ] Banner the rolled-up plans (`ALL_PHASE_PLANS_CONSOLIDATED.md`, `EXECUTION_TASKLIST.md`, `EXPANDED_*`, `IMPLEMENTATION_PLAN.md`, `ORDER_LIFECYCLE_PLAN.md`, `live-recovery-postmortem-*.md`) as `[HISTORICAL]`
- [ ] Grep the repo for any tool/script reference to a moved path; fix or document

### Sub-phase B — Repo map
- [ ] Write `docs/operations/repo-map.md` describing the directory layout and the role of each top-level entrypoint, so a future operator (or me, fresh-context) can orient in 60 seconds
- [ ] Cross-link from `AGENTS.md`

### Sub-phase C — Runtime cleanup
- [ ] Run `node scripts/cleanup-runtime-artifacts.js --portfolio=etf --dry-run` and capture the output
- [ ] If retention says nothing to remove, document the fact and move on (do not invent new retention rules)
- [ ] If retention says X items can be removed, run without `--dry-run`

### Sub-phase D — Memory & tools freshening
- [ ] Update `TOOLS.md` to cross-link `docs/operations/cron.md` (which is now canonical)
- [ ] Update `MEMORY.md` only if it contains genuinely stale facts (don't churn for the sake of it)
- [ ] Refresh `memory/2026-05-25.md` with a short tail capturing today's work
- [ ] Update `PROGRESS_REPORT.md`, `SPEC_PROGRESS.md`, `ROLLUP_OUTSTANDING_PLAN.md` to reflect S2/S3 completion

### Sub-phase E — Regression test
- [ ] Add `scripts/test-repo-root-cleanliness.js` that asserts:
  - Every `phase-N*.md` in the repo root is either a current stabilization plan (`phase-S*`) OR banner-tagged `[HISTORICAL]` OR moved to `archive/phase-plans/`
  - `docs/operations/repo-map.md` exists
- [ ] Wire into `verifyRepoChecks`

## Acceptance criteria
- `ls *.md | wc -l` in the repo root falls from ~388 to a single, scannable shortlist (target: under 30 files)
- `archive/phase-plans/README.md` explains the move and search procedure
- `docs/operations/repo-map.md` lists every top-level entry with a one-line role
- `npm test` exits 0 (33+ checks)
- No script or doc reference becomes broken (`git grep` clean)

## Out
A repo a fresh operator (or future bb8) can read in under 5 minutes to know what's load-bearing, what's history, and what's runtime state.
