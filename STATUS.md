# STATUS - Portfolio Manager

> Single source of truth for the current operational state.
> Live work lives in `CURRENT_PLAN.md`. Historical plans, audits, and task notes live under `archive/`.

**Last refreshed:** 2026-06-03 12:30 UTC
**Repo head:** current `master` (see `git log -1 --oneline` for exact head)

---

## Health at a glance

| Lane | State | Notes |
| --- | --- | --- |
| ETF portfolio read/report path | healthy | regular reporting surfaces build from current repo/runtime state |
| IBKR socket / auth / read | green | readonly access and reporting flows are healthy |
| IBKR quote posture | degraded | `marketDataMode=unknown`; live submission stays blocked pending operator-side diagnosis |
| Holdings sync | functional | sync is truthful and usable, though still not especially fast |
| Dashboard / report emails | healthy | light-only theme; hero shows Net deposited; Total return vs deposits headline; usage counters auto-refreshed at send time |
| Deposits ledger | wired | `portfolio/etf/deposits.md` (8 deposits, 120k CHF net); `history.md` carries cumulative `Net deposited CHF` per row; auto-import CLI available |
| Safe-lane verification | green | last run: 241 passed, 0 failed, 3 quarantined |
| Cron jobs | healthy snapshot | latest tracked cron snapshot is healthy; see `docs/operations/active-cron-jobs.md` |
| OpenClaw control UI | healthy | session-retention cleanup and current repo surfaces are in place |

## What works

- Markdown-controlled portfolio contracts (`portfolio.md`, `holdings.md`, `trades.md`, `history.md`, `dashboard.md`).
- Native IBKR readonly client for account discovery, positions, and accounting snapshots.
- Sync guard lock plus last-known-good preservation on broker reads.
- Approval-gated execution flow with dry-run, confirmation, and transmitted-live boundaries.
- Reporting stack: dashboard, health reports, overview surfaces, digests, investor emails, fill emails.
- Test governance and repo-truth checks (`npm test`, manifest/domain-summary validation, root-cleanliness gate).
- Archive-backed history: completed phase plans, audits, and task notes live outside the current docs.

## What is degraded

- **Quote posture is still `unknown`.** The reporting/read path is fine, but live order submission remains blocked until the IBKR subscription/data-farm diagnosis in `docs/operations/ibkr-recovery.md` Step 6 is completed.

## What is blocked or parked

- **Live order submission** - blocked by quote posture, not by the readonly/reporting path.
- **Control UI direct embedding** - target exists, editable source remains undiscovered or unavailable.
- **FX cash reconciliation** - parked as Graham-owned WIP unless explicitly reactivated.
- **Spitex exploration** - concept only; not active implementation work.

## Current open-work buckets

- **Phase B — Operator/external unblockers** - IBKR runbook Step 6, then re-test live submission.
- **Phase D — Parked product/domain explorations** - FX recon, Control UI embedding (Spitex removed as out-of-scope).

Full breakdown in `CURRENT_PLAN.md`. Phase A and Phase C completed 2026-06-03 — see `archive/phase-plans/2026-06-03-phase-a-c/README.md`.
## Operator quick refs

- IBKR live status: `node scripts/ibkr-fast-status.js`
- Sync after recovery: `node scripts/sync-ibkr-after-recovery.js etf`
- Compact dashboard: `node scripts/show-dashboard.js etf`
- Cron snapshot: `docs/operations/active-cron-jobs.md`
- Recovery ladder: `docs/operations/ibkr-recovery.md`

## Where things live

| Concern | File |
| --- | --- |
| Spec | `SPECIFICATION.md` |
| Live plan | `CURRENT_PLAN.md` |
| Operational truth | `STATUS.md` |
| Repo map | `docs/operations/repo-map.md` |
| Current runbooks / setup docs | `docs/operations/*.md`, `docs/setup/*.md` |
| Historical phase plans | `archive/phase-plans/**` |
| Historical audits / roadmaps | `archive/docs/**` |
| Historical task notes / harvesters | `archive/tasks/**` |
| Daily memory | `memory/YYYY-MM-DD.md` |
