# Phase plans archive

This directory holds completed phase plans, actionable checklists, and older implementation roadmaps that are no longer part of the live current-doc set.

## What lives here

- `phase-N-*.md`, `phase-NN-*.md`, `phase-NNN-*.md` - historical build and stabilization phases
- `phase-*-actionable-checklist.md` - companion checklists for those phases
- `phase-S*.md` and other stabilization plans - completed stabilization/doc-truth work
- legacy rollout/roadmap/spec files that were superseded by `CURRENT_PLAN.md`, `STATUS.md`, and `SPECIFICATION.md`

## Current-doc contract

The live repo should point operators at only these planning/status surfaces:

- `CURRENT_PLAN.md` - real open work only
- `STATUS.md` - current operational truth
- `SPECIFICATION.md` - system contract
- `docs/operations/repo-map.md` - where to find live docs vs archive docs

Anything that looks like a completed phase, historical roadmap, or stale working note belongs under `archive/` rather than the live surfaces.

## Search procedure

```bash
git log --follow -- archive/phase-plans/phase-NNN-name.md
git grep 'search term' archive/phase-plans/
```
