# Decisions pending — single surface

**Owner:** Graham
**Last refreshed:** 2026-06-04 20:00 UTC

---

## Active decisions

_(empty — all open decisions resolved or scheduled)_

---

## Scheduled (calendar-gated)

| Item | Earliest review | What you'll be asked |
|---|---|---|
| **H2 — allocation path** | 2026-06-17 | Pick path A (no change), B (light deconcentration), or C (full rotation). Baseline anchor: `docs/research/h1-baseline-2026-06-03.json`. bb8 will surface this on the date. |

---

## Operator-recurring (FYI)

| Item | What to do |
|---|---|
| B5 — IBKR keepalive 2FA | Respond to alerts when they fire |
| Fill-monitor cron | Enable only during live execution; disable after fills land or end-of-day |
| F4 / G3 — XLS backfill | Drop next IBKR transactions XLS into `runtime/ibkr-statements/inbox/` |

---

## Parked (no action unless reactivating)

| Item | Reason parked |
|---|---|
| D1 — FX cash reconciliation | Reactivate only if live ops confused |
| D2 — Control UI direct embedding | Source not yet available |
| D3 — EM ex-China sleeve | No physical Acc UCITS on IBKR feed |

---

## Recently closed (this week)

| Item | Resolution |
|---|---|
| D-1 — Sentry smoke event | ✅ Resolved via API. Token now has `event:admin`. |
| D-2 — IBKR XLS backfill | ⏸ Parked. Inbox cron auto-picks-up when XLS lands. |
| D-3 — Allocation path | ⏸ Confirmed deferred to 2026-06-17. |
| D-4 — Phase J autofix | ✅ Shipped (`d49af30`). |

---

## Quick reply templates

- **"do H2 now"** → bb8 will draft a recommendation against partial data (calendar wants 2026-06-17)
- **"reactivate D1/D2/D3"** → bb8 will lift the parked phase and write a plan
- **"resolve sentry issue X"** → use `resolveIssue()` helper directly
