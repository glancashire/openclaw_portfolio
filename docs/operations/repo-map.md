# Repository map

A 60-second orientation for the live repo. Updated 2026-06-02 during current-doc consolidation.

## Top-level layout

| Path | Role |
|---|---|
| `archive/` | Historical plans, audits, and task notes. Not part of the live operator surface. |
| `brokers/` | Broker-specific notes and helper docs. |
| `config/` | Static config templates and examples. |
| `docs/` | Current operator/developer documentation. Start here for how the system works today. |
| `lib/` | Shared modules consumed by `src/` and `scripts/`. |
| `memory/` | Daily notes plus durable memory artifacts. |
| `portfolio/` | Markdown portfolio contracts and generated report artifacts. |
| `runtime/` | Runtime state and generated overview artifacts. |
| `scripts/` | Operator CLIs and `test-*.js` regression checks. |
| `skills/` | Workspace-scoped skills. |
| `src/` | Production source. |
| `tests/` | Additional integration/unit fixtures. |
| `tmp/` | Throwaway scratch area. Not a live planning surface. |
| `plans/` | Optional temporary home for one active detailed implementation plan. Often absent in steady state. |

## Live root files

### Identity and policy
- `AGENTS.md`
- `SOUL.md`
- `USER.md`
- `IDENTITY.md`
- `HEARTBEAT.md`
- `TOOLS.md`
- `MEMORY.md`
- `artifact-policy.md`
- `system-policy.md`
- `playbook.md`

### Current engineering truth
- `SPECIFICATION.md` - system contract
- `CURRENT_PLAN.md` - open work, open decisions, recommended execution order
- `STATUS.md` - operational health / blocked state snapshot

## Current docs worth reading first

| Path | When to read it |
|---|---|
| `docs/operations/repo-map.md` | You need orientation |
| `docs/test-governance.md` | You need to understand `npm test`, lanes, or manifest truth |
| `docs/operations/cron.md` | You are touching cron jobs |
| `docs/operations/active-cron-jobs.md` | You need the latest cron snapshot |
| `docs/operations/ibkr-recovery.md` | IBKR quote posture or readiness is degraded |
| `docs/basket-execution-runbook.md` | You are placing or reconciling baskets |
| `docs/execution-command-surface.md` | You need the canonical execution CLI surface |
| `docs/trading-workflow.md` | You want the end-to-end trading lifecycle |
| `docs/setup/mailgun-infra-enable-checklist.md` | You are unblocking Mailgun inbound |

## Archive layout

- `archive/phase-plans/` - completed phase plans and historical roadmaps/specs
- `archive/docs/` - archived audits and superseded current-looking docs
- `archive/tasks/` - archived harvesters, wave plans, and working notes
- `archive/README.md` - archive rules and search tips

## Where to start, by question

- **What is the system supposed to do?** -> `SPECIFICATION.md`
- **What is the current health/blocker picture?** -> `STATUS.md`
- **What is still open, and in what order?** -> `CURRENT_PLAN.md`
- **What is running on timers?** -> `docs/operations/active-cron-jobs.md`
- **Why is live trading blocked?** -> `docs/operations/ibkr-recovery.md`
- **How do I verify a change safely?** -> `docs/test-governance.md` then `npm test`
- **What is historical context only?** -> `archive/`
