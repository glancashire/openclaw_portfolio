# STATUS - Portfolio Manager

> Single source of truth for the current operational state.
> Live work lives in `CURRENT_PLAN.md`. Pending decisions live in `docs/decisions-pending.md`.

**Last refreshed:** 2026-06-04 12:35 UTC
**Repo head:** `31cd6f0` (Phase I — lifecycle counter, trend log, dashboard surfacing)
**Tests:** `npm test` 23/23 · `npm run test:safe` 251/251

---

## Health at a glance

| Lane | State | Notes |
| --- | --- | --- |
| ETF portfolio read/report path | healthy | |
| IBKR socket / auth / read | green | |
| Live order submission | unblocked | |
| Holdings sync | functional | |
| Dashboard / report emails | healthy | |
| Fill-confirmation emails | healthy | `monitor-fills` cron disabled by default |
| Deposits ledger | wired | 9 deposits, 140k CHF cumulative |
| Health monitor | upgraded | single `state` field, escalation-only, 24h rate-limit, paste-ready bb8 prompt |
| Sentry error tracking | live | weekly autofix cron Mon 09:00 CET |
| Safe-lane verification | green | 251/251, 0 failed, 3 quarantined |
| Cron jobs | healthy | 11 enabled + 1 disabled (`monitor-fills` by policy) |

## Known residual

5 trade rows (orders 9164–9168) show `submitted` but were cancelled at the broker. Lifecycle counter correctly classifies them as "awaiting reconcile" (not in-flight). Health state remains `attention` until they're reconciled via `sync-portfolio-order-status`. Rate-limited to 1 email/day.

## What shipped today

- Sentry integration end-to-end (instrumentation + weekly autofix cron)
- Health-monitor simplification (state field, escalation gate, persistence check, rate-limit, 4-block email)
- Phase I (lifecycle counter fix, health-trend.jsonl, dashboard surfacing)
- Fill-monitor cron policy locked in
- Phases F6, G4, H1 closed

## What is open

| Phase | Status | Blocker |
|---|---|---|
| J — second-pass autofix | PARKED | reactivate only if needed |
| F4 — XLS backfill | WAITING | next IBKR login |
| G2/G3 — deposits cron | WAITING | XLS (same as F4) |
| H2/H3 — allocation decision | WAITING | calendar (2026-06-17) |
| B5 — IBKR keepalive | OPS | recurring, no engineering |
| D1/D2/D3 — explorations | PARKED | explicit reactivation |

## Operator quick refs

```bash
# Dashboard
node scripts/show-dashboard.js etf

# Health check (one-shot)
node scripts/run-health-check.js portfolio/etf --send-email

# Reconcile stale orders (needs IBKR)
for id in 9164 9165 9166 9167 9168; do
  node scripts/sync-portfolio-order-status.js portfolio/etf $id
done

# Sentry
node scripts/fetch-sentry-issues.js --json
node scripts/sentry-autofix-weekly.js --dry-run

# Fill monitor lifecycle
openclaw cron enable d4c3207d-9e03-4e98-85eb-2eff38f50d4d
openclaw cron disable d4c3207d-9e03-4e98-85eb-2eff38f50d4d
```
