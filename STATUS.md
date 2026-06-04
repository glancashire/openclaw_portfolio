# STATUS - Portfolio Manager

> Single source of truth for the current operational state.

**Last refreshed:** 2026-06-04 13:00 UTC
**Repo head:** `d49af30`
**Tests:** 254/254 · **Health:** 🟢 healthy

---

## Health at a glance

| Lane | State |
| --- | --- |
| ETF portfolio read/report path | healthy |
| IBKR socket / auth / read | green |
| Live order submission | unblocked |
| Holdings sync | functional |
| Dashboard / report emails | healthy |
| Fill-confirmation emails | healthy (`monitor-fills` cron disabled by default) |
| Deposits ledger | wired (9 deposits, 140k CHF cumulative) |
| Deposits inbox cron | wired (daily-sync scans `runtime/ibkr-statements/inbox/`) |
| Health monitor | 🟢 healthy — escalation-only, 24h rate-limit, paste-ready bb8 prompt |
| Health second-pass autofix | wired (5 fixers, 24h per-code rate-limit, triggers on attention/critical) |
| Sentry error tracking | live (weekly autofix cron Mon 09:00 CET) |
| Safe-lane verification | 254 passed, 0 failed, 3 quarantined |
| Cron jobs | healthy (11 enabled + 1 disabled by policy) |

## What shipped 2026-06-04

1. Sentry integration end-to-end
2. Health-monitor simplification (state field, escalation gate, persistence, rate-limit, 4-block email)
3. Phase I (lifecycle counter, health-trend.jsonl, dashboard surfacing)
4. Stale order reconciliation + terminal not_found classification
5. Fill-monitor cron policy, Phases F6/G4/H1 closed
6. **Phase G2** — deposits inbox wired into daily-sync cron (30 test assertions)
7. **Phase J** — second-pass autofix (40 + 16 = 56 test assertions)

## What is open

| Phase | Status | Blocker |
|---|---|---|
| F4 — XLS backfill | WAITING | next IBKR login |
| G3 — deposits XLS backfill | WAITING | same as F4 |
| H2/H3 — allocation decision | WAITING | calendar (2026-06-17) |
| B5 — IBKR keepalive | OPS | recurring |
| D1/D2/D3 — explorations | PARKED | explicit reactivation |

## Operator quick refs

```bash
node scripts/show-dashboard.js etf
node scripts/run-health-check.js portfolio/etf --send-email
node scripts/process-ibkr-statement-inbox.js --portfolio=etf
node scripts/fetch-sentry-issues.js --json
openclaw cron enable d4c3207d-9e03-4e98-85eb-2eff38f50d4d   # fill monitor on
openclaw cron disable d4c3207d-9e03-4e98-85eb-2eff38f50d4d  # fill monitor off
```
