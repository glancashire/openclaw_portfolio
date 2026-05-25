# Phase plans archive

This directory holds historical phase plans, actionable checklists, and rolled-up
documents that drove the portfolio-manager build-out from MVP through the
2026-05 stabilization work.

## Why they're here

They were cluttering the repository root (388 markdown files → unmanageable).
They are kept under `git mv` so the history is intact and `git log --follow`
still works on any individual file.

## Search procedure

```bash
git log --follow -- archive/phase-plans/phase-NNN-name.md
git grep 'some-search-term' archive/phase-plans/
```

## What lives where

- `phase-N-*.md` and `phase-NN-*.md` — original MVP build phases (1–10)
- `phase-NNN-*.md` — refinement, hardening, and stabilization phases (100–209)
- `phase-NNN-actionable-checklist.md` — the actionable companion for each phase
- `master-plan-204-212.md` / `master-plan-204-212-refined.md` — the multi-phase
  cron/sandbox/operator-surface plan (Phase 204c implemented the
  `agents.defaults.sandbox.mode = off` fix that still governs the host today;
  see `TOOLS.md` and `docs/operations/cron.md` for the live policy)
- `consolidated-roadmap-checklist.md` — cross-phase roll-up
- `ALL_PHASE_PLANS_CONSOLIDATED.md` — one-document mirror
- `IMPLEMENTATION_PLAN.md` / `EXPANDED_IMPLEMENTATION_PLAN.md` — original
  build-out scaffolds (superseded by the per-phase plans)
- `ORDER_LIFECYCLE_PLAN.md` / `EXPANDED_PORTFOLIO_SPECIFICATION.md` — original
  designs that the current `SPECIFICATION.md` evolved from
- `live-recovery-postmortem-2026-05-13.md` — incident postmortem from the
  May 13 live-flip incident
- `EXECUTION_TASKLIST.md` — original task tracker

## What stays in the root (current docs)

The repo root keeps only:

- Persona / role files: `AGENTS.md`, `SOUL.md`, `USER.md`, `IDENTITY.md`,
  `HEARTBEAT.md`, `TOOLS.md`, `MEMORY.md`
- Spec + progress: `SPECIFICATION.md`, `SPEC_PROGRESS.md`, `PROGRESS_REPORT.md`,
  `ROLLUP_OUTSTANDING_PLAN.md`, `post-mvp-roadmap.md`,
  `spec-outstanding-checklist.md`
- Active stabilization (Phase S1–S5) plans: `phase-S*-*.md` and
  `stabilization-master-plan-2026-05-25.md`
- Live policy: `artifact-policy.md`, `system-policy.md`, `playbook.md`

If a phase plan needs to come back to the root because work is reopened, just
`git mv` it back and banner the top with `[REACTIVATED 2026-MM-DD]`.
