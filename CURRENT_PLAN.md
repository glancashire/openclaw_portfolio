# CURRENT_PLAN — What we're working on now

> The **only** living plan document. Status snapshot lives in `STATUS.md`.
> Anything historical is under `archive/phase-plans/`.

**Last refreshed:** 2026-06-01 22:55 UTC

---

## Visual roadmap

```text
Phase Cleanup-1 (1A 1B 1C 1D 1E 1F 1G 1H)  [DONE]       ██████████
Mailgun inbound infra                       [WAITING]    ██░░░░░░░░
Control UI direct embedding                 [BLOCKED]    ██████░░░░
FX cash reconciliation                      [PARKED]     ██░░░░░░░░
IBKR market-data subscriptions              [WAITING]    ██░░░░░░░░
```

Legend: `DONE` = closed phase; `WAITING` = blocked on external access or operator decision; `BLOCKED` = implementation surface unavailable; `PARKED` = intentionally not taken over.

---

## How this file works

- **One active phase at a time.** Detail lives in `plans/<phase>.md`. This file points at it.
- **Backlog** lists what's queued, in priority order, with one-line scopes.
- **Decisions needed** lists explicit operator/Graham calls that gate progress.
- **Blocked / parked** lists work that exists but cannot move autonomously.
- When a phase commits + pushes, mark it done here, then archive the plan file under `archive/phase-plans/`.

---

## Active phase

_None._

Next pickup will create a fresh `plans/<phase>.md` and lift one of the backlog items into "Active phase".

---

## Backlog (queued, ordered)

| # | Lane | One-liner | Source |
| --- | --- | --- | --- |
| B1 | Reporting | Decide monthly-report file policy: track `.md` only and ignore `.html/.json/.pdf`, or track all four. **Auto-decided 2026-06-01:** track `.md` only, ignore deterministic derivatives. Closed by Phase Cleanup-1A. | (closed) |
| B2 | Cron | Configure announce delivery target (Telegram `chatId`) so periodic outputs reach the operator, or formalize file-only via Phase Cleanup-1F (already documented). | open / operator |
| B3 | IBKR | Verify market-data subscriptions on U25624150 from IBKR client portal — see `docs/operations/ibkr-recovery.md` Step 6. | open / operator |
| B4 | Reporting | Investor weekly overview wording polish — currently synthesized; may need real-CHF-totals checks against management summary. | future |
| B5 | Tests | Wire the new `test-cron-delivery-posture.js`, `test-readiness-bounded-stages.js`, `test-holdings-sync-perf-and-avg-cost.js`, `test-dashboard-delta-truth.js`, `test-ibkr-recovery-runbook.js` regressions into the `safe-lane` runner if not already discovered automatically. | future |

When a backlog item is picked up, lift it into "Active phase" with a dedicated `plans/<phase>.md`.

---

## Decisions needed from Graham

1. **Cron delivery target (B2)** — configure a Telegram `chatId` for announce, or accept the documented file-only posture? File-only is healthy today; this is an opt-in upgrade.
2. **IBKR market-data subscription (B3)** — please confirm subscriptions on U25624150 via the IBKR Client Portal; runbook step 6 has the navigation and an `ib_insync` cross-check. Once subscriptions are confirmed active, live submission can be re-enabled.

---

## Blocked / parked

| Item | State | Why |
| --- | --- | --- |
| Live order submission | BLOCKED | Quote posture `unknown`; pending Decision #2 above. |
| Mailgun inbound | WAITING | Code READY (`lib/mailgunInbound.js`); needs infra route for `c3po@mailgun.swift.ch`. |
| Control UI direct embedding | BLOCKED | Editable app surface unavailable. |
| FX cash reconciliation | PARKED | Graham-owned WIP, untouched on purpose. |

---

## Recently completed (last 30 days, summary)

Detailed close-out notes live in `memory/YYYY-MM-DD.md`. Plan files for these phases are under `archive/phase-plans/`.

- **Phase Cleanup-1 (1A–1H)** — 2026-06-01. End-of-day issue roundup; eight autonomous sub-phases; all green and pushed. Notable wins: holdings sync 124 s → 36 s, dashboard now distinguishes degraded posture from timeout, dashboard deltas no longer lie under unknown posture, cron health verified, IBKR subscription runbook step 6 documented.
- **Plan/doc consolidation** — 2026-06-01. 16 root plan/overview files + 57 plan files in `plans/` collapsed into `STATUS.md` + `CURRENT_PLAN.md` + one active `plans/<phase>.md`.
- **Phase UX-1** — IBKR fast-status, recovery runbook, sync-after-recovery, session retention policy. `openclaw status` 14.2 s → 2.4 s.
- **Phase IBKR-B1** — Native account discovery + sync unblock.
- **Phase IBKR-B2** — Sync guard lock + false-zero protection + last-known-good preservation.
- **Phase 2B** — Config truth + IBKR default centralization.
- **Phase 4B** — Test governance and manifest truth.
- **Phase 5B** — Artifact hygiene + supported script surface.
- **Phase 7B** — Cron health + guided remediation truth.

---

## Working agreements

- **Test-first**, plan-first, review-first per `skills/superpowers-openclaw/SKILL.md`.
- **Per phase:** plan committed first → tests added/updated → focused regressions → clean commit (no generated churn) → push.
- **Generated churn excluded** from commits: `portfolio/*/dashboard.md`, `holdings.md`, `holdings-avg-cost.json`, `runtime/events/runtime-events.jsonl`, monthly/weekly/quarterly report `.html/.json/.pdf` quartet (Phase Cleanup-1A locked this).
- **Never restart `openclaw` daemon** without explicit confirmation (kills active session).
- **Live submission stays blocked** until quote posture clears (operator-gated).
