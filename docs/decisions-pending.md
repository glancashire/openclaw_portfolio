# Decisions pending — single surface

**Owner:** Graham
**Last refreshed:** 2026-06-04 12:35 UTC

---

## Active decisions

### D-1 — Reconcile the 5 stale trade rows (operator action)
Orders 9164–9168 are marked `submitted` in `trades.md` but were cancelled at the broker. Until reconciled, health state stays `attention` (one email per 24h, accurate message, not urgent).

- **Recommend:** ✅ Run when IBKR is connected:
  ```bash
  for id in 9164 9165 9166 9167 9168; do
    node scripts/sync-portfolio-order-status.js portfolio/etf $id
  done
  ```
  After that, health flips to `healthy` and attention emails stop entirely.
- **Alternative:** ignore — the rate-limit caps noise at 1 email/day with an accurate "reconcile" message.

### D-2 — Sentry smoke event `OPENCLAW_PORTFOLIO-1`
Still unresolved in Sentry UI. Token lacks `event:admin` scope.

- **Recommend:** ✅ Resolve manually in Sentry UI next time you sign in (~10 sec).
- **Alternative:** Add `event:admin` scope to the `sntryu_…` token so bb8 can resolve programmatically.

### D-3 — F4 / G3 — IBKR XLS backfill
The 2026-06-03 deposit row carries `pending_ibkr_xls`.

- **Recommend:** ⏸ Leave it. Backfill naturally on next IBKR login.

### D-4 — H2 — Allocation path A/B/C
4 new deconcentration ETFs alongside SXR8 + EMUAA.

- **Recommend:** ⏸ Defer until **2026-06-17** (14 days post-deconcentration). Baseline anchor: `docs/research/h1-baseline-2026-06-03.json`.

### D-5 — Phase J — second-pass autofix
- **Recommend:** ⏸ Leave parked. Current gate + rate-limit already solves the noise.

---

## Operator-recurring (FYI, no decision needed)

| Item | What to do |
|---|---|
| B5 — IBKR keepalive 2FA | Respond to alerts when they fire |
| Fill-monitor cron | Enable only during live execution: `openclaw cron enable d4c3207d…` / disable after |

---

## Parked (no action unless reactivating)

| Item | Reason parked |
|---|---|
| D1 — FX cash reconciliation | Reactivate only if live ops confused |
| D2 — Control UI direct embedding | Source not yet available |
| D3 — EM ex-China sleeve | No physical Acc UCITS on IBKR feed |

---

## Quick reply templates

- **"reconcile"** → bb8 runs `sync-portfolio-order-status` for 9164–9168 (needs IBKR up)
- **"chase the XLS"** → prompt with IBKR statements URL
- **"decide H2 now"** → draft recommendation against partial data
- **"do Phase J"** → start second-pass autofix
- **"rotate token with event:admin"** → exact steps for Sentry scope change
