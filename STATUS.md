# STATUS — Portfolio Manager

> Single source of truth for the **current state** of the system.
> **Live planning lives in `CURRENT_PLAN.md`.** Spec lives in `SPECIFICATION.md`.
> Everything historical is under `archive/phase-plans/`.

**Last refreshed:** 2026-06-01 19:55 UTC
**OpenClaw:** 2026.5.28 (e932160)
**Repo head:** `d38f5eb` — plan: phase cleanup-1 end-of-day issue roundup

---

## Health at a glance

| Lane | State | Notes |
| --- | --- | --- |
| ETF portfolio (live) | ✅ healthy reads | NetLiq CHF 100'766.08, 9 positions, cash CHF 14'701.69 |
| IBKR socket / auth / read | ✅ green | exit 0–3 paths all healthy |
| IBKR quote posture | ⚠️ degraded | `marketDataMode=unknown`; live submission **blocked** |
| Holdings sync | ✅ functional, ⚠️ slow | ~124 s for 9 positions; root cause: posture-probe budget |
| Dashboard / reports | ✅ regenerates | message overstates "timeout" when broker is reachable but degraded |
| Safe-lane test suite | ✅ green | `test-effective-config` and `test-execution-authority` now pass after OpenClaw 2026.5.28 |
| Cron jobs | ⚠️ delivery-only | 1 job in `error` state from delivery layer; substantive work runs |
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

- **Quote posture `unknown`** on U25624150 — `fetchMarketSnapshot` returns neither live (84/86/31) nor delayed (88/87) fields. Likely a market-data subscription / data-farm state on the IBKR side. Reads remain healthy; live submission stays gated.
- **Dashboard wording** lumps "broker reachable but degraded" with "broker timed out". Misleading but cosmetic.
- **Holdings sync wall-clock** (~124 s) dominated by per-candidate posture probes when posture is `unknown`.

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
| Active phase plan | `plans/phase-cleanup-1-end-of-day-issue-roundup-2026-06-01.md` |
| Operational runbooks | `docs/operations/*.md` |
| Setup guides | `docs/setup/*.md` |
| History | `archive/phase-plans/**` |
| Daily working notes | `memory/YYYY-MM-DD.md` |
