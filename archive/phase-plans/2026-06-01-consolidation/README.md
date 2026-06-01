# Consolidation 2026-06-01 — README

This directory holds plan, overview, progress, and checklist documents that were superseded by the consolidation on 2026-06-01.

## Why archived

The repo had drifted to **57 plan files** in `plans/` plus **16 plan-like Markdown files** at the workspace root (W-phase plans, multiple overviews, checklists, and progress reports). The information was largely overlapping, partially stale, and made it hard to know what was actually current.

On 2026-06-01 the plan was consolidated into:

- `STATUS.md` — current snapshot (what works, what's degraded, what's blocked).
- `CURRENT_PLAN.md` — the single living plan (active phase + backlog + decisions).
- `plans/phase-cleanup-1-end-of-day-issue-roundup-2026-06-01.md` — the active phase plan.

`SPECIFICATION.md`, `MEMORY.md`, `SOUL.md`, `USER.md`, `IDENTITY.md`, `AGENTS.md`, `TOOLS.md`, `playbook.md`, `system-policy.md`, and `artifact-policy.md` continue as canonical sources of truth.

## What is in here

### From the workspace root

- `OPEN_PHASES_OVERVIEW.md` — superseded by `STATUS.md` + `CURRENT_PLAN.md`.
- `PHASE_OVERVIEW.md` — superseded by `STATUS.md` + `CURRENT_PLAN.md`.
- `PROGRESS_REPORT.md` — superseded; recent progress lives in `memory/YYYY-MM-DD.md`.
- `ROLLUP_OUTSTANDING_PLAN.md` — superseded by `CURRENT_PLAN.md` backlog.
- `SPEC_PROGRESS.md` — Spec §1 is engineering-complete; spec lives in `SPECIFICATION.md`.
- `spec-outstanding-checklist.md` — closed/complete; archived for audit history.
- `phase-W1-doc-archive-and-rollup-closeout-plan.md`
- `phase-W2-cron-policy-consolidation-plan.md`
- `phase-W3-health-synthesis-tighten-plan.md`
- `phase-W4-runtime-hash-gating-plan.md`
- `phase-W5-cancel-broker-only-plan.md`
- `phase-W6-native-contract-intelligence-plan.md`
- `phase-W7-portfolio-health-model-plan.md`
- `phase-W8-approval-lifecycle-ux-plan.md`
- `phase-W9-recovery-playbooks-plan.md`
- `phase-W10-automated-verification-lanes-plan.md`

### From `plans/`

All plan files except the currently-active `plans/phase-cleanup-1-end-of-day-issue-roundup-2026-06-01.md` were archived here. Highlights:

- Phases 2/2A/2B (config + env hardening), 4B (test governance), 5B (artifact hygiene), 7B (cron health), IBKR-B1/B2 (native sync) — completed and pushed.
- Phases A–N, V1, V2, R1–R6, K, L, M (older lanes) — historical, completed prior to wave closeout.
- `follow-ups.md` — the original deferred-follow-up doc; resolved by Phase G TTL cache.
- `phase-c1-current-doc-consolidation-plan-2026-05-31.md` — earlier consolidation pass; this consolidation supersedes it.
- `phase-o1-ibkr-readiness-and-open-work-closeout-plan-2026-05-31.md` — closed by Phase IBKR-B1/B2.
- `2026-06-01-ibkr-readiness-classification-plan.md` — closed by readiness commit `b92592c`.

## How to use this archive

Treat everything here as read-only history. If a phase is referenced from a current commit, follow the trail through the archive; do not bring the file back unless the work is being explicitly re-opened, in which case create a fresh `plans/<phase>.md`.

For repo orientation, see `docs/operations/repo-map.md`.
