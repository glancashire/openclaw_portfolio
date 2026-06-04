# Decisions pending — single surface

**Owner:** Graham
**Last refreshed:** 2026-06-04 20:38 UTC

---

## Active decisions

### D-5 — Build the energy + nuclear sleeve?

**What:** Add 4–7% allocation across XDWE / NUCL / INRE.

**Status:** Research + preflight complete. Plan stub ready. Live-hours probe scheduled for Fri 2026-06-05 13:00 UTC.

**Recommend:** ⏸ wait for Friday probe results, then decide. The probe will confirm whether the close-snap spreads we saw (1.08% / n/a / 0.49%) tighten to acceptable levels (<0.40%) during EU trading hours. If yes → go. If no → swap NUCL fallback to NUKL-Paris and re-probe.

**Cost of delay:** zero — the sleeve is additive, not corrective.

**Three options when Graham decides:**
1. **Go** — bb8 lifts K-series stub to `plans/`, runs K1 baseline, generates K2 basket proposals (3 size variants), stops at approval gate
2. **Park** — leave research in place, revisit at H2 review on 2026-06-17
3. **Modify shortlist** — Graham wants different instruments (e.g. swap clean-energy INRE for water/AI/something else)

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

- **"build the energy sleeve"** → bb8 lifts K-stub to `plans/`, runs K1, generates K2 basket proposals
- **"park the energy sleeve"** → leave research, revisit at H2
- **"do H2 now"** → bb8 drafts a recommendation against partial data (calendar wants 2026-06-17)
- **"reactivate D1/D2/D3"** → bb8 lifts the parked phase and writes a plan
- **"resolve sentry issue X"** → use `resolveIssue()` helper directly
