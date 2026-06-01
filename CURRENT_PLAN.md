# CURRENT_PLAN — What we're working on now

> The **only** living plan document. Status snapshot lives in `STATUS.md`.
> Anything historical is under `archive/phase-plans/`.

**Last refreshed:** 2026-06-01 19:55 UTC

---

## Visual roadmap

```text
Cleanup-1 Tranche 1 (1A 1B 1G 1C)        [STARTED]    █░░░░░░░░░
Cleanup-1 Tranche 2 (1D 1E 1F)           [OPEN]       ░░░░░░░░░░
Cleanup-1 Tranche 3 (1H IBKR subs)       [WAITING]    ░░░░░░░░░░
Mailgun inbound infra                    [WAITING]    ██░░░░░░░░
Control UI direct embedding              [BLOCKED]    ██████░░░░
FX cash reconciliation                   [PARKED]     ██░░░░░░░░
```

Legend: `STARTED` = active autonomous lane; `OPEN` = ready to start; `WAITING` = blocked on external access or operator decision; `BLOCKED` = implementation surface unavailable; `PARKED` = intentionally not taken over.

---

## How this file works

- **One active phase at a time.** Detail lives in `plans/<phase>.md`. This file points at it.
- **Backlog** lists what's queued, in priority order, with one-line scopes.
- **Decisions needed** lists explicit operator/Graham calls that gate progress.
- **Blocked / parked** lists work that exists but cannot move autonomously.
- When a phase commits + pushes, mark it done here, then archive the plan file under `archive/phase-plans/`.

---

## Active phase

### Phase Cleanup-1 — End-of-day issue roundup and fix plan

- **Plan:** `plans/phase-cleanup-1-end-of-day-issue-roundup-2026-06-01.md`
- **Status:** plan committed (`d38f5eb`); not yet executing.
- **Scope:** 8 sub-phases (1A–1H) across 3 tranches.

**Tranches:**

1. **Tranche 1 — autonomous, low risk**
   - [x] 1A. Working-tree hygiene: stash dropped, `runtime-events.jsonl` + report derivatives gitignored, regression test `test-gitignore-policy.js`.
   - [x] 1B. `regenerate-dashboard.js` accepts bare portfolio name (with regression test `test-regenerate-dashboard-cli.js`).
   - [x] 1G. Migrate deprecated `messages.groupChat.visibleReplies` config key — NO-OP (verified valid in current schema; warning was stale).
   - [x] 1C. Dashboard: distinguish "reachable + degraded posture" from "timed out" (staged auth + posture bounding; new `posture_detection_timeout` fallback shape with regression test `test-readiness-bounded-stages.js`).
2. **Tranche 2 — autonomous, deeper**
   - 1D. Bound posture-probe wall-clock during holdings sync; skip identical avg-cost rewrites.
   - 1E. Surface "Today / This week" deltas as `—` under `posture=unknown` instead of silent `+0.00`.
   - 1F. Cron delivery hardening: ensure every job has `--best-effort-deliver`; resolve `portfolio-health-monitor` error.
3. **Tranche 3 — operator-gated**
   - 1H. Document IBKR market-data subscription posture verification (no auto-fix).

---

## Backlog (queued, ordered)

| # | Lane | One-liner | Source |
| --- | --- | --- | --- |
| B1 | UX-2 | Trim holdings-sync wall-clock — covered by Cleanup-1D. Track here if it grows past one phase. | follow-on |
| B2 | Reporting | Decide monthly-report file policy: track `.md` only and ignore `.html/.json/.pdf`, or track all four. | Cleanup-1A.Q1 |
| B3 | Cron | Configure announce delivery target so periodic outputs reach the operator (or formalize file-only). | Cleanup-1F.Q2 |
| B4 | IBKR | Verify market-data subscriptions on U25624150 from IBKR client portal. | Cleanup-1H.Q3 |
| ~~B5~~ | ~~Tests~~ | ~~Reconcile stash `stash@{0}` — SXR8 generic-control candidate.~~ Done in 1A; stash dropped. | Cleanup-1A |

When a backlog item is picked up, lift it into "Active phase" with a dedicated `plans/<phase>.md`.

---

## Decisions needed from Graham

1. **Monthly-report policy** — track all four artefacts (`.md/.html/.json/.pdf`) in git, or just `.md`?
2. **Cron delivery target** — configure a `chatId` for announce, switch to email/file output, or accept dashboard-only surfacing?
3. **IBKR market-data subscription** — please confirm subscriptions are still active on U25624150 (client-portal action).

---

## Blocked / parked

| Item | State | Why |
| --- | --- | --- |
| Live order submission | BLOCKED | Quote posture `unknown`; pending Decision #3. |
| Mailgun inbound | WAITING | Code READY (`lib/mailgunInbound.js`); needs infra route for `c3po@mailgun.swift.ch`. |
| Control UI direct embedding | BLOCKED | Editable app surface unavailable. |
| FX cash reconciliation | PARKED | Graham-owned WIP, untouched on purpose. |

---

## Recently completed (last 30 days, summary)

Detailed close-out notes live in `memory/YYYY-MM-DD.md`. Plan files for these phases are under `archive/phase-plans/2026-06-01-consolidation/`.

- **Phase UX-1** — IBKR fast-status, recovery runbook, sync-after-recovery, session retention policy. `openclaw status` 14.2 s → 2.4 s.
- **Phase IBKR-B1** — Native account discovery + sync unblock.
- **Phase IBKR-B2** — Sync guard lock + false-zero protection + last-known-good preservation.
- **Phase 2B** — Config truth + IBKR default centralization.
- **Phase 4B** — Test governance and manifest truth.
- **Phase 5B** — Artifact hygiene + supported script surface.
- **Phase 7B** — Cron health + guided remediation truth.
- **Closure of W1–W10 wave** — completed prior to consolidation; archived.

---

## Working agreements

- **Test-first**, plan-first, review-first per `skills/superpowers-openclaw/SKILL.md`.
- **Per phase:** plan committed first → tests added/updated → focused regressions → clean commit (no generated churn) → push.
- **Generated churn excluded** from commits: `portfolio/*/dashboard.md`, `holdings.md`, `holdings-avg-cost.json`, `runtime/events/runtime-events.jsonl`, monthly report quartet (until B2 decided).
- **Never restart `openclaw` daemon** without explicit confirmation (kills active session).
- **Live submission stays blocked** until quote posture clears.
