# Phase C2 — Current docs consolidation and open-work reset

Date: 2026-06-02
Status: planned

## Goal
Reduce the repo to one clean live plan surface plus a small supporting current-doc set, while moving stale audit/phase/task notes into the historical archive.

## Scope
- audit current planning/status/checklist docs outside `archive/`
- rewrite `CURRENT_PLAN.md` so it reflects only real open work
- refresh `STATUS.md` and `docs/operations/repo-map.md` to match the new current-doc contract
- archive completed or superseded planning docs that still look current
- leave generated runtime/portfolio artifacts alone

## Intended current doc set after closeout
- `CURRENT_PLAN.md` — open phases and decisions only
- `STATUS.md` — current operational truth
- `SPECIFICATION.md` — system contract
- `docs/operations/repo-map.md` — where live docs vs archive docs live
- existing operational docs/runbooks that describe how the system works today

## Candidate archive moves
- `docs/project-audit-2026-05-30.md`
- `docs/project-improvement-roadmap.md`
- `docs/operations/fill-html-mail-follow-up-plan.md`
- `tasks/*.md` historical wave/audit/closeout notes

## Verification
- inspect moved/current docs
- `node scripts/test-open-phases-card.js`
- `node scripts/test-plan-doc-truth.js`
- `node scripts/test-repo-root-cleanliness.js`
- `npm test`

## Acceptance
- current docs are concise, consistent, and point at real open work only
- stale current-looking plans/checklists are archived
- operator/external blockers and autonomous-ready backlog are explicit
- verification passes
