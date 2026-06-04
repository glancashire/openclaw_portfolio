# Decisions pending — single surface

**Owner:** Graham
**Last refreshed:** 2026-06-04 16:05 UTC

---

## Active decisions

_(empty — all open decisions resolved)_

---

## Completed (closed today)

| Item | Resolution |
|---|---|
| D-1 — Sentry smoke event `OPENCLAW_PORTFOLIO-1` | ✅ Resolved programmatically. Token now has `event:admin`. Smoke issue marked resolved via API (id 7526237514). `resolveIssue()` helper added to `sentryApi.js` so weekly autofix cron can resolve issues after fixes land. |
| D-2 — F4 / G3 — IBKR XLS backfill | ⏸ Parked by Graham. The deposits inbox cron (Phase G2) will pick up the XLS automatically whenever it lands. No active follow-up. |
| D-3 — H2 — Allocation path A/B/C | ⏸ Confirmed deferred to **2026-06-17** (14 days post-deconcentration). Baseline anchor: `docs/research/h1-baseline-2026-06-03.json`. Will surface again on the calendar date. |
| D-4 — Phase J second-pass autofix | ✅ Shipped (`d49af30`). 5 fixers, 24h rate-limit, wired into health check. |
| G2 — Deposits cron wiring | ✅ Shipped (`467fc05`). Inbox at `runtime/ibkr-statements/inbox/`. |

---

## Operator-recurring (FYI)

| Item | What to do |
|---|---|
| B5 — IBKR keepalive 2FA | Respond to alerts when they fire |
| Fill-monitor cron | Enable only during live execution; disable after |

---

## Parked (no action unless reactivating)

| Item | Reason parked |
|---|---|
| D1 — FX cash reconciliation | Reactivate only if live ops confused |
| D2 — Control UI direct embedding | Source not yet available |
| D3 — EM ex-China sleeve | No physical Acc UCITS on IBKR feed |

---

## Quick reply templates

- **"do H2 now"** → draft recommendation against partial data (calendar wants 2026-06-17)
- **"reactivate FX reconciliation"** → start D1
