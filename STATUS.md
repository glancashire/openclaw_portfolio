# STATUS — Portfolio Manager

> Single source of truth for the **current state** of the system.
> **Live planning lives in `CURRENT_PLAN.md`.** Spec lives in `SPECIFICATION.md`.
> Everything historical is under `archive/phase-plans/`.

**Last refreshed:** 2026-06-02 15:45 UTC
**Repo head:** current `master` (see `git log -1 --oneline` for exact head)

---

## Health at a glance

| Lane | State | Notes |
| --- | --- | --- |
| ETF portfolio (live) | ✅ healthy reads | NetLiq CHF 100'750.58, 9 positions, cash CHF 14'687.85 |
| IBKR socket / auth / read | ✅ green | exit 0–3 paths all healthy |
| IBKR quote posture | ⚠️ degraded | `marketDataMode=unknown`; live submission **blocked** — operator-gated, see runbook step 6 |
| Holdings sync | ✅ functional, ⚠️ tolerable | ~36 s for 9 positions (was 124 s; Phase Cleanup-1D parallelized) |
| Dashboard / reports | ✅ truthful | Posture-aware messaging (Phase Cleanup-1C); deltas show `unknown` under degraded posture (Phase Cleanup-1E) |
| Safe-lane test suite | ✅ 13/13 PASS | gitignore-policy, regenerate-dashboard-cli, repo-root-cleanliness, open-phases-card, effective-config, execution-authority, trading-guards, readiness-bounded-stages, holdings-sync-perf-and-avg-cost, dashboard-delta-truth, cron-delivery-posture, ibkr-recovery-runbook, diagnostics-script-compat |
| Cron jobs | ✅ 11/11 healthy | All `ok`/`idle`, 0 consecutive errors, all `bestEffort:true`. File-only delivery posture documented. |
| OpenClaw control UI | ✅ snappy | `status` 14s → 2.4s after retention policy applied |

---

## What works

- Markdown-controlled portfolio contracts (portfolio.md / holdings.md / trades.md / history.md / dashboard.md).
- Native IBKR readonly client (account discovery, positions, accounting snapshot).
- Sync guard lock + last-known-good preservation (no false-zero rewrites).
- Execution authority pipeline (dry-run → require_confirmation → transmitted_live with explicit ack).
- Approval gate, basket execution, market-calendar awareness.
- Reporting pipeline: dashboard, weekly/monthly/quarterly reports, investor health/email.
- Self-maintaining session retention via `session.maintenance.mode = enforce`.
- IBKR fast-status probe (5 s tier-1 socket/auth/read/quote check) + recovery runbook.

## What is degraded

- **Quote posture `unknown`** on U25624150 — `fetchMarketSnapshot` returns neither live (84/86/31) nor delayed (88/87) fields. Likely a market-data subscription / data-farm state on the IBKR side. Reads remain healthy; live submission stays gated. **Investigation steps are in `docs/operations/ibkr-recovery.md` Step 6 (operator-gated).**
- **Dashboard wording** lumps "broker reachable but degraded" with "broker timed out". Misleading but cosmetic. (resolved by Phase Cleanup-1C — staged readiness now distinguishes the two outcomes.)
- **Holdings sync wall-clock** ~~(~124 s)~~ — reduced to ~36 s by Phase Cleanup-1D parallel snapshot fetches.

## What is blocked or parked

- **Live order submission** — gated by quote posture. Operator-side action on IBKR client portal needed.
- **Mailgun inbound** — code-side READY (`lib/mailgunInbound.js`); waiting on infra route configuration for `c3po@mailgun.swift.ch`.
- **Control UI direct embedding** — implementation target exists, editable surface unavailable.
- **FX cash reconciliation** — Graham-owned WIP, intentionally not taken over.

---

## Truth markers

- **Spec §1 engineering scope:** complete.
- **Closeout phases (committed and pushed):** Phase 2B, 4B, 7B, 5B, IBKR-B1, IBKR-B2, UX-1.
- **Two previously-blocking timeouts cleared:**
  - `scripts/test-effective-config.js` — runs in <5 s, exit 0.
  - `scripts/test-execution-authority.js` — runs in <5 s, exit 0.
- **Stash `stash@{0}`** is functionally redundant; its content was merged in `1e51f7b`.

## Operator quick refs

- IBKR live status: `node scripts/ibkr-fast-status.js`
- Sync after recovery: `node scripts/sync-ibkr-after-recovery.js etf`
- Compact dashboard: `node scripts/show-dashboard.js etf`
- Cron list: `openclaw cron list`
- Recovery ladder: `docs/operations/ibkr-recovery.md`

## Where things live

| Concern | File |
| --- | --- |
| Identity / persona | `IDENTITY.md`, `SOUL.md`, `USER.md`, `AGENTS.md` |
| Long-term memory | `MEMORY.md`, `memory/YYYY-MM-DD.md` |
| Spec | `SPECIFICATION.md` |
| Live plan | `CURRENT_PLAN.md` |
| Active phase plan | none — see `CURRENT_PLAN.md` backlog view |

| Operational runbooks | `docs/operations/*.md` |
| Setup guides | `docs/setup/*.md` |
| History | `archive/phase-plans/**` |
| Daily working notes | `memory/YYYY-MM-DD.md` |
