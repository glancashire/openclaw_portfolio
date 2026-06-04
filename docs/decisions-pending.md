# Decisions pending — single surface

**Owner:** Graham
**Last refreshed:** 2026-06-04 09:30 UTC
**Read this with:** `CURRENT_PLAN.md` (engineering surface) + `STATUS.md` (operational state)

When you reply with **"go with defaults"**, bb8 will adopt every recommendation marked **Recommend** below and start Phase I (I1 → I2 → I3) autonomously. Override any item by saying e.g. *"go, but on D-3 do X instead"*.

---

## Active decisions (need an answer to unblock work)

### D-1 — Approve Phase I autonomous execution
**Phase I — Health-monitor follow-on.**
The lifecycle counter currently misclassifies long-dead `inactive` rows as in-flight, which keeps the ETF health state stuck at `attention`. Until this is fixed, the new escalation email + 24h rate limit will fire on a false signal every 24h.

- **Recommend:** ✅ go. Three steps, all behind tests, no execution-path writes:
  1. **I1** — fix `lifecycleSummary` so `inactive` is terminal, not in-flight.
  2. **I2** — append per-cycle entry to `runtime/overview/health-trend.jsonl`.
  3. **I3** — surface the trend in `scripts/show-dashboard.js`.
- **Risk:** very low. Read-only summarizer change; no order or approval surface touched.
- **What "no" looks like:** if you'd rather defer this and live with one false-positive attention email every 24h, say "park Phase I". The new gate + rate limit means it's at most one email/day.

### D-2 — Phase J — second-pass autofix
**Currently:** parked.
- **Recommend:** ⏸ leave parked. The gate + persistence + rate-limit already eliminate the noisy cases Phase J was meant to solve. Revisit only if Phase I lands and we still see one-tick attention emails.
- **Override:** say "do Phase J after Phase I" if you want it anyway.

### D-3 — F4 / G3 — IBKR XLS backfill window
The 2026-06-03 deposit row carries `pending_ibkr_xls` until the XLS lands.
- **Recommend:** ⏸ leave the placeholder. Backfill when the next IBKR login pulls the XLS naturally.
- **Override:** say "chase the XLS" and I will prompt you with the IBKR statements URL.

### D-4 — H2 — allocation path A vs B vs C
The 4 new deconcentration ETFs (XDEW, MWEQ, IS3H, DXS0) currently sit alongside SXR8 + EMUAA with provisional targets. Earliest review date per the baseline snapshot: **2026-06-17**.
- **Recommend:** ⏸ defer until 2026-06-17. The baseline captured today (`docs/research/h1-baseline-2026-06-03.json`) is the comparison anchor.
- **Override:** say "decide H2 now" and bb8 will draft a recommendation against partial data.

### D-5 — Smoke event resolution in Sentry UI
The Phase 5 verification event `OPENCLAW_PORTFOLIO-1` is still **unresolved** in Sentry. The current `sntryu_…` token has read scopes only — bb8 can't resolve via API (401 on PUT).
- **Recommend:** ✅ resolve it manually in the Sentry UI when you next sign in. ~10 seconds. **Or** add the `event:admin` scope to the token if you want bb8 to keep it tidy autonomously.
- **Override:** say "rotate token with event:admin" and bb8 will give you the exact steps.

---

## Operator-recurring (no decision, just FYI)

### Ops-1 — B5 — IBKR keepalive 2FA
The native gateway keepalive cron will alert you when the IB Gateway session needs re-login / 2FA approval on display `:99`. Respond when you see the alert. No engineering needed.

### Ops-2 — Fill-monitor cron lifecycle
`portfolio-etf-monitor-fills` (`d4c3207d-9e03-4e98-85eb-2eff38f50d4d`) is **disabled by default**. Enable only while a basket is approved AND orders are pending fills:
- Enable: `openclaw cron enable d4c3207d-9e03-4e98-85eb-2eff38f50d4d`
- Disable: `openclaw cron disable d4c3207d-9e03-4e98-85eb-2eff38f50d4d` (when fills land or at end of trading day, whichever comes first)

---

## Parked (no decision unless reactivating)

| Item | Reason parked |
|---|---|
| D1 — FX cash reconciliation | Reactivate only if live ops becomes confused by FX drift |
| D2 — Control UI direct embedding | Editable source not yet available |
| D3 — EM ex-China sleeve | No physical Acc UCITS resolves on IBKR feed |

---

## Quick reply templates

- **"go with defaults"** → execute D-1 (Phase I), keep D-2/D-3/D-4/D-5 as recommended, ignore parked.
- **"go, but park I"** → leave the lifecycle counter alone; live with the daily false-positive attention email.
- **"go and do J after I"** → I1 → I2 → I3 → J1 → J2 → J3.
- **"chase the XLS"** → prompt me with the IBKR statements URL.
- **"decide H2 now"** → draft a recommendation against the partial data.
- **"rotate token with event:admin"** → give me the exact steps for the Sentry UI.
