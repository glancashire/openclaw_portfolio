# Repository map

A 60-second orientation for any operator (or fresh-context agent) opening this
workspace. Updated 2026-05-25 (Phase S4).

## Top-level layout

| Path | Role |
|---|---|
| `archive/phase-plans/` | Historical phase plans. Audit only; do not link from current docs. |
| `brokers/` | Python helpers for IBKR (Interactive Brokers) and any future broker adapters. |
| `config/` | Static config templates. |
| `dist/` | Build output. Generated, not committed (gitignored). |
| `docs/` | Current operator and developer documentation. **Start here for `how does X work today`.** |
| `learnings/` | Notes captured by the self-improving-agent skill. |
| `lib/` | Pure Node modules consumed by `src/` and `scripts/`. |
| `memory/` | Daily memory notes (`YYYY-MM-DD.md`) plus structured memory artifacts. |
| `node_modules/` | npm install output. Gitignored. |
| `plans/` | Active multi-step plans (TaskFlow style). Distinct from `archive/phase-plans/`. |
| `portfolio/` | Markdown-source-of-truth portfolio definitions and their generated reports. |
| `runtime/` | Runtime state: market-calendar, basket proposals, approvals, execution state, circuit breakers, etc. Gitignored except snapshots committed for tests. |
| `scripts/` | Operator CLIs and the `test-*.js` regression suite (`npm test` runs `verifyRepoChecks` against this). |
| `secrets/` | Local secrets store. Gitignored. |
| `skills/` | Workspace-scoped skills (e.g., `superpowers-openclaw`, `portfolio-orchestrator`). |
| `src/` | Production source. |
| `tests/` | Misc integration fixtures. |
| `tmp/` | Throwaway working files. Gitignored. |

## Root-level Markdown files

### Persona & role
- `AGENTS.md` — workspace startup procedure, red lines, group-chat rules
- `SOUL.md` — assistant tone, values, voice
- `USER.md` — what we know about Graham
- `IDENTITY.md` — assistant identity (bb8 🤖)
- `HEARTBEAT.md` — active background tasks for heartbeat polling

### Live policy & how-to
- `TOOLS.md` — local-host invariants (sandbox mode, IBKR native gateway recovery, reporting stabilization, repo hygiene). **Cross-link with `docs/operations/cron.md`.**
- `MEMORY.md` — curated long-term memory (main session only)
- `playbook.md` — reusable command recipes
- `artifact-policy.md` — what we persist where and why
- `system-policy.md` — execution policy controls

### Spec, status & plan
- `SPECIFICATION.md` — the system contract
- `STATUS.md` — current health snapshot (what works, what's degraded, what's blocked)
- `CURRENT_PLAN.md` — the single living plan (active phase + backlog + decisions)
- `plans/<phase>.md` — the active phase's detailed plan (one at a time)

### History
- `archive/phase-plans/` — every retired plan (per-phase audit trail)
- `archive/phase-plans/2026-06-01-consolidation/` — the 2026-06-01 consolidation drop, including the older `OPEN_PHASES_OVERVIEW.md`, `PHASE_OVERVIEW.md`, `PROGRESS_REPORT.md`, `ROLLUP_OUTSTANDING_PLAN.md`, `SPEC_PROGRESS.md`, `spec-outstanding-checklist.md`, the W1-W10 wave plans, and the bulk of `plans/phase-*.md`.

## `docs/` highlights

| Path | When to read it |
|---|---|
| `docs/test-governance.md` | Human-facing entry point for test lanes, manifest, and quarantine policy |
| `docs/operations/cron.md` | Adding, editing, or debugging cron jobs |
| `docs/operations/active-cron-jobs.md` | Snapshot of what's scheduled right now |
| `docs/operations/active-cron-jobs.json` | Machine-readable mirror used by `test-cron-job-policy.js` |
| `docs/operations/repo-map.md` | This file |
| `docs/basket-execution-runbook.md` | Order-basket execution workflow |
| `docs/basket-envelope-schema.md` | Basket data model |
| `docs/dashboard-v2.md` | Dashboard format |
| `docs/email-digest.md` | Email digest design and template |
| `docs/execution-command-surface.md` | The execution CLI surface |
| `docs/observability.md` | Where to look when things go wrong |
| `docs/operator-runbooks.md` | Routine operator procedures |
| `docs/self-heal-recipes.md` | Common recovery patterns |
| `docs/trading-workflow.md` | End-to-end trading lifecycle |
| `docs/transmitted-live-operations.md` | Live-flip context |
| `docs/migration_learnings.md` | Lessons learned during migrations |

## `scripts/` highlights

- `scripts/test-*.js` — regression suite gated by `npm test` (see `src/reporting/verifyRepoChecks.js` for the curated subset)
- `scripts/diagnostics/*.js` — operator-run, read-only IBKR diagnostic probes (guarded by `test-diagnostics-require-paths.js`)
- `scripts/sync-interactive-brokers-holdings.js` — daily IBKR sync
- `scripts/sync-market-calendar.js` — daily contract-hours sync
- `scripts/regenerate-dashboard.js` — dashboard refresh
- `scripts/run-health-check.js` — portfolio health report
- `scripts/propose-basket.js` — basket proposer (the order surface for live trading)
- `scripts/cleanup-runtime-artifacts.js` — conservative runtime garbage collection

## Where to start, by task

- **"What's the system supposed to do?"** → `SPECIFICATION.md`
- **"What's running on a timer?"** → `docs/operations/active-cron-jobs.md`
- **"Why did this cron job fail?"** → `docs/operations/cron.md` + `TOOLS.md`
- **"How do I verify a change didn't break anything?"** → `npm test`
- **"What was decided yesterday/today?"** → `memory/YYYY-MM-DD.md`
- **"What's the active work?"** → `CURRENT_PLAN.md` (with detail in `plans/<phase>.md`)
- **"What's the current health?"** → `STATUS.md`
- **"What does this old phase plan say?"** → `archive/phase-plans/`
