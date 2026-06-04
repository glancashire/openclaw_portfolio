# Current Plan

**Date:** 2026-06-04 (refreshed 13:00 UTC)
**Repo head:** `d49af30` (feat: Phase J — targeted second-pass autofix)
**Tests:** `npm test` 23/23 · `npm run test:safe` 254/254
**Health:** 🟢 healthy — All systems normal.

## Visual roadmap (open work only)

```text
Phase J  Second-pass autofix                                    [DONE]     ██████████
Phase G2 Deposits inbox → daily-sync cron                       [DONE]     ██████████
Phase F  Fill-pipeline residuals (XLS backfill)                 [WAITING]  █████████░
Phase G3 Deposits XLS backfill                                  [WAITING]  █████████░
Phase H  Allocation-target decision                             [WAITING]  ████░░░░░░
Phase B  IBKR ops residual                                      [OPS]      █████████░
Phase D  Parked product/domain explorations                     [PARKED]   █░░░░░░░░░
```

**No autonomous engineering work is ready to start.** Everything remaining is calendar-gated, operator-gated, or explicitly parked.

---

## Completed today (2026-06-04, second batch)

- [x] **G2** — `scripts/process-ibkr-statement-inbox.js` wired into daily-sync cron. 30 test assertions. Inbox at `runtime/ibkr-statements/inbox/`.
- [x] **J** — `src/reporting/healthFixers.js` dispatch table (5 fixers), 24h rate-limit, wired into `runHealthCheck`, escalation email updated. 56 test assertions.

---

## Phase F — Fill-pipeline residuals (operator-gated)

- [x] F1–F3, F5, F6 — shipped
- [ ] **F4** — Backfill `pending_ibkr_xls` for 2026-06-03 deposit row when next IBKR XLS arrives.

---

## Phase G — Deposits ledger close-out

- [x] G1, G2, G4 — shipped
- [ ] **G3** — Backfill XLS reference (same action as F4 — needs IBKR statement file).

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
