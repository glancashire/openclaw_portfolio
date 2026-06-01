# Phase Cleanup-1 — Archive (closed 2026-06-01)

Phase Cleanup-1 ran end-of-day on 2026-06-01 and closed the same evening. It surveyed every issue (live, repo-hygiene, cron, tests, docs, hidden) found after the OpenClaw `2026.5.6 → 2026.5.28` update and Phase UX-1 closeout, then drove eight sub-phases (1A–1H) across three tranches autonomously.

## What it produced

| Sub-phase | Outcome | Commits |
| --- | --- | --- |
| 1A — Working-tree hygiene | Stash dropped; report derivatives + `runtime-events.jsonl` gitignored; regression test | `08a8ae2` |
| 1B — `regenerate-dashboard.js` ergonomics | Accepts bare portfolio name; CLI test | `199e516` |
| 1C — Dashboard truth for degraded posture | Staged auth+posture readiness; `posture_detection_timeout` shape | `ecc5cfd` |
| 1D — Sync wall-clock + avg-cost diff guard | 124s → 36s (3.4×); canonicalized avg-cost guard | `f7bc1b4` |
| 1E — Dashboard delta truth | `unknown` instead of silent `+0.00` under degraded posture | `7607080` |
| 1F — Cron delivery posture | Verified all 11 jobs healthy; runbook entry; regression test | `c7cd13d` |
| 1G — Deprecated config key | NO-OP — verified no longer deprecated | `e78920d` |
| 1H — IBKR subscription runbook | Step 6 added to recovery runbook (operator-gated) | `d976da8` |

## What it did not do

- Live submission remains blocked. Step 6 of `docs/operations/ibkr-recovery.md` describes the operator-side investigation needed to clear `marketDataMode=unknown`.
- Configuring announce delivery (Telegram chatId) is operator-personal and intentionally not auto-applied.
- Mailgun inbound, Control UI direct embedding, and FX cash reconciliation remain in their pre-existing waiting/blocked/parked states.

## See also

- `STATUS.md`, `CURRENT_PLAN.md` — current state of the repo.
- `archive/phase-plans/2026-06-01-consolidation/` — the prior consolidation drop that introduced the STATUS/CURRENT_PLAN structure.
