# Decisions pending — single surface

**Owner:** Graham
**Last refreshed:** 2026-06-04 12:55 UTC

---

## Active decisions

### D-1 — Sentry smoke event `OPENCLAW_PORTFOLIO-1`
Still unresolved in Sentry UI. Token lacks `event:admin` scope.

- **Recommend:** ✅ Resolve manually in Sentry UI next time you sign in (~10 sec).
- **Alternative:** Add `event:admin` scope to the `sntryu_…` token so bb8 can resolve programmatically.

### D-2 — F4 / G3 — IBKR XLS backfill
The 2026-06-03 deposit row carries `pending_ibkr_xls`.

- **Recommend:** ⏸ Leave it. Backfill naturally on next IBKR login.

### D-3 — H2 — Allocation path A/B/C
4 new deconcentration ETFs alongside SXR8 + EMUAA.

- **Recommend:** ⏸ Defer until **2026-06-17** (14 days post-deconcentration). Baseline anchor: `docs/research/h1-baseline-2026-06-03.json`.

### D-4 — Phase J — second-pass autofix
- **Recommend:** ⏸ Leave parked. Current gate + rate-limit already solves the noise.

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

- **"chase the XLS"** → prompt with IBKR statements URL
- **"decide H2 now"** → draft recommendation against partial data
- **"do Phase J"** → start second-pass autofix
- **"rotate token with event:admin"** → exact steps for Sentry scope change
