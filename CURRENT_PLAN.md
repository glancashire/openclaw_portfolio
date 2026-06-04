# Current Plan

**Date:** 2026-06-04 (consolidated 12:35 UTC)
**Repo head:** `31cd6f0` (Phase I — lifecycle counter, trend log, dashboard surfacing)
**Tests:** `npm test` 23/23 · `npm run test:safe` 251/251
**Last archive batch:** [`archive/phase-plans/2026-06-04-sentry-and-health-monitor/`](archive/phase-plans/2026-06-04-sentry-and-health-monitor/)

## Visual roadmap (open work only)

```text
Phase J  Health-monitor Phase B (second-pass autofix)           [PARKED]   ░░░░░░░░░░
Phase F  Fill-pipeline residuals (XLS backfill)                 [WAITING]  █████████░
Phase G  Deposits ledger close-out                              [WAITING]  █████░░░░░
Phase H  Allocation-target decision                             [WAITING]  ████░░░░░░
Phase B  IBKR ops residual                                      [OPS]      █████████░
Phase D  Parked product/domain explorations                     [PARKED]   █░░░░░░░░░
```

**No autonomous engineering work is ready to start.** Everything remaining is calendar-gated, operator-gated, or explicitly parked.

## Document map

| File | Role |
|---|---|
| `CURRENT_PLAN.md` (this file) | Open work + decisions |
| `STATUS.md` | Operational health snapshot |
| `SPECIFICATION.md` | System contract |
| `docs/decisions-pending.md` | Pending operator decisions |
| `MEMORY.md` + `memory/YYYY-MM-DD.md` | Durable memory + daily notes |
| `playbook.md` | Project skills + reusable patterns |
| `docs/operations/*.md` | Operator runbooks (cron, IBKR recovery, host contract, Sentry) |
| `archive/phase-plans/**` | All completed/historical plans |

## What shipped today (2026-06-04)

1. **Sentry integration** — end-to-end (instrumentation, API read, weekly autofix cron, runbook, smoke event).
2. **Health-monitor simplification** — single `state` field, escalation-only emails, persistence check, 24h rate-limit, 4-block email with paste-ready bb8 prompt.
3. **Fill-monitor cron policy** — disabled by default, lifecycle documented.
4. **Phase I — health-monitor follow-on:**
   - ✅ I1: Lifecycle counter now separates `submitted-awaiting-reconcile` (stale bookkeeping) from genuinely in-flight orders. Dashboard and health messages are accurate.
   - ✅ I2: `runtime/overview/health-trend.jsonl` — one JSON line per health-check cycle.
   - ✅ I3: `scripts/show-dashboard.js` surfaces the health trend tail.
5. **Phases F6, G4, H1** — all closed.

---

## Phase J — Health-monitor Phase B (PARKED)

- [ ] J1 — `src/reporting/healthFixers.js` dispatch table
- [ ] J2 — Hook into `runHealthCheck` after pass-1
- [ ] J3 — Tests

**Reactivate only if** we still see frequent attention emails after the persistence + rate-limit gate.

---

## Phase F — Fill-pipeline residuals (operator-gated)

- [x] F1–F3, F5, F6 — shipped
- [ ] **F4** — Backfill `pending_ibkr_xls` for 2026-06-03 deposit row when next IBKR XLS arrives.

---

## Phase G — Deposits ledger close-out (operator-gated)

- [x] G1, G4 — shipped
- [ ] **G2** — Wire `import-ibkr-deposits.js` into daily-sync cron (depends G3).
- [ ] **G3** — Backfill XLS reference (same action as F4).

---

## Phase H — Allocation-target decision (calendar-gated)

- [x] H1 — baseline frozen
- [ ] **H2** — Decide path A/B/C for the 4 new ETFs. **Earliest review: 2026-06-17.**
- [ ] **H3** — Apply H2 decision to `portfolio.md`.

---

## Phase B — IBKR ops residual

- [x] B1–B4 — shipped
- [ ] **B5** — Respond to keepalive 2FA alerts. Recurring ops, no engineering.

---

## Phase D — Parked product/domain explorations

- [ ] D1 — FX cash reconciliation
- [ ] D2 — Control UI direct embedding
- [ ] D3 — EM ex-China sleeve

---

## Known residual issue

The ETF health state is `attention` because 5 `trades.md` rows have status `submitted` with no broker confirmation (orders 9164–9168, known cancelled but never reconciled in the ledger). The lifecycle counter now correctly classifies them as "awaiting reconcile" instead of "in-flight", and the message is accurate ("run sync-portfolio-order-status to reconcile"). The 24h rate-limit prevents email spam. To resolve fully, run:

```bash
node scripts/sync-portfolio-order-status.js portfolio/etf 9164
node scripts/sync-portfolio-order-status.js portfolio/etf 9165
node scripts/sync-portfolio-order-status.js portfolio/etf 9166
node scripts/sync-portfolio-order-status.js portfolio/etf 9167
node scripts/sync-portfolio-order-status.js portfolio/etf 9168
```

This requires IBKR connectivity. Once reconciled, health state will flip to `healthy` and no more attention emails will fire.
