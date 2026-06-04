# Current Plan

**Date:** 2026-06-04 (consolidated 12:55 UTC)
**Repo head:** `86f901c` (fix: treat failed+not_found trade rows as terminal)
**Tests:** `npm test` 23/23 · `npm run test:safe` 251/251
**Health:** 🟢 healthy — All systems normal.

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

---

## Phase J — Health-monitor Phase B (PARKED)

- [ ] J1 — `src/reporting/healthFixers.js` dispatch table
- [ ] J2 — Hook into `runHealthCheck` after pass-1
- [ ] J3 — Tests

**Reactivate only if** frequent attention emails resume despite the current gate.

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
