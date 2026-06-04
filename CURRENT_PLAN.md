# Current Plan

**Date:** 2026-06-04 (consolidated 09:30 UTC)
**Repo head:** `e97313d` (escalation email includes copy-paste bb8 prompt)
**Tests:** `npm test` 23/23 · `npm run test:safe` 250/250
**Last archive batch:** [`archive/phase-plans/2026-06-04-sentry-and-health-monitor/`](archive/phase-plans/2026-06-04-sentry-and-health-monitor/)

## Visual roadmap (open work only)

```text
Phase I  Health-monitor follow-on (lifecycle bug + trend log)   [READY]    ░░░░░░░░░░
Phase J  Health-monitor Phase B (second-pass autofix)           [PARKED]   ░░░░░░░░░░
Phase F  Fill-pipeline residuals                                [WAITING]  █████████░
Phase G  Deposits ledger close-out                              [WAITING]  █████░░░░░
Phase H  Allocation-target decision                             [WAITING]  ████░░░░░░
Phase B  IBKR ops residual                                      [OPS]      █████████░
Phase D  Parked product/domain explorations                     [PARKED]   █░░░░░░░░░
```

**Engineering surface that can start now:** Phase I (deterministic, blocks the next attention email being useful).
**Everything else:** waiting on calendar time, operator action, or explicit reactivation.

## Document map (only what is current)

| File | Role |
|---|---|
| `CURRENT_PLAN.md` (this file) | Open work + decisions |
| `STATUS.md` | Operational health snapshot |
| `SPECIFICATION.md` | System contract |
| `MEMORY.md` + `memory/YYYY-MM-DD.md` | Durable memory + daily notes |
| `playbook.md` | Project skills + reusable patterns |
| `docs/operations/*.md` | Operator runbooks (cron, IBKR recovery, host contract, Sentry) |
| `archive/phase-plans/**` | All completed/historical plans |

Anything not in this list is historical.

## What dropped off because it shipped (since last consolidation 2026-06-03)

- **Sentry integration end-to-end** — instrumentation, API read path, weekly autofix cron, runbook, smoke event verified. Cron job id `fef83af7-89a0-4f5c-aaf8-293dfd7b37ae`, enabled, Mon 09:00 Europe/Zurich.
- **Health monitor — single source of truth + escalation gate** — `state`/`summary`/`canonicalNextAction` shipped, email only fires on persistent `attention`/`critical`, 24h rate-limit per blocker-code set, new 4-block format with paste-ready bb8 prompt.
- **Fill-monitor cron policy** — `portfolio-etf-monitor-fills` (id `d4c3207d-9e03-4e98-85eb-2eff38f50d4d`) disabled by default. Enable only during live execution.
- **Phase F6** — `basketLifecycle.js` deferred-email comment retired.
- **Phase G4** — deposits-ledger lifecycle in `docs/operator-runbooks.md`.
- **Phase H1** — allocation baseline JSON + markdown frozen.

Full closure log: `archive/phase-plans/2026-06-04-sentry-and-health-monitor/README.md`.

---

## Phase I — Health-monitor follow-on (READY for autonomous execution)

**Why this phase exists.** While shipping the health-monitor simplification, two real follow-ups surfaced that block the next escalation email from being useful even with the new clean format.

- [ ] **I1 — Fix lifecycle counter so `inactive` orders aren't counted as in-flight.**
  Root: `src/reporting/deliveryPolicy.js#reportPendingActions` sums `staged + submitted + partiallyFilled` from the lifecycle summary, but rows with broker status `inactive` (e.g. order rejected, contract resolution failed) are being included in the in-flight bucket by the lifecycle summarizer. Result: 5 long-dead `inactive` rows in `portfolio/etf/trades.md` keep the health state stuck at `attention`. **Files:** `src/portfolio/execution/tradesLifecycle.js` (or wherever `lifecycleSummary` is computed), `src/reporting/deliveryPolicy.js` (defensive), new `scripts/test-lifecycle-summary-inactive.js`. **Scope:** read/summary only; **no execution-path writes**.
- [ ] **I2 — Append health-trend log.**
  Add a one-line append per cycle to `runtime/overview/health-trend.jsonl` (`{ ts, portfolio, state, summary, blockerCodes }`). Lets the dashboard surface the watch state and gives a future "is bb8 watching anything?" answer without checking the inbox. **Files:** `src/reporting/healthReport.js` (append after writeArtifacts), new `scripts/test-health-trend-jsonl.js`.
- [ ] **I3 — Surface the trend in the dashboard.**
  Read the tail of `health-trend.jsonl` in `scripts/show-dashboard.js` to show: `health: healthy (last 4 cycles)` or `health: watch — N in-flight rows (since 2026-06-04 14:00 UTC)`. **Files:** `scripts/show-dashboard.js`, `scripts/test-show-dashboard-health-tail.js`.

**Verification:** All three pieces ship behind tests, `npm run test:safe` stays green, and a fresh `node scripts/run-health-check.js portfolio/etf` against current state returns `state: healthy` (instead of `attention`).

---

## Phase J — Health-monitor Phase B (PARKED, optional)

**Why parked.** The escalation gate + persistence + rate-limit already eliminate the false-positive emails the original Phase B was meant to fix. Targeted second-pass autofix is now a nice-to-have, not a need.

- [ ] J1 — `src/reporting/healthFixers.js` dispatch table (whitelist: `regenerate_*`, `reconcile_inflight_rows`, `repoll_broker_readiness`).
- [ ] J2 — Hook into `runHealthCheck` after pass-1.
- [ ] J3 — Tests covering "second pass clears symptom" and "stuck symptom still escalates".

**Reactivate only if:** Phase I lands and we still see a noticeable rate of single-tick attention emails. Otherwise leave parked.

---

## Phase F — Fill-pipeline residuals (operator-gated)

- [x] F1–F3, F5, F6 — shipped
- [ ] **F4** — Backfill the 2026-06-03 deposits-ledger row's `pending_ibkr_xls` placeholder once the next IBKR XLS arrives. Operator action (same XLS unlocks G3).

---

## Phase G — Deposits ledger close-out

- [x] G1, G4 — shipped
- [ ] **G2** — Wire `import-ibkr-deposits.js` into the daily-sync cron once the XLS download path is stable (depends G3).
- [ ] **G3** — Backfill `pending_ibkr_xls` for 2026-06-03 row when XLS arrives (operator-driven, same action as F4).

---

## Phase H — Allocation-target decision (data-gated)

- [x] H1 — baseline frozen `docs/research/h1-baseline-2026-06-03.json`
- [ ] **H2** — Decide path A (additive: keep SXR8 + EMUAA alongside the 4 new ETFs) vs path B (replace legacy slots) vs path C (partial replace). **Earliest review date: 2026-06-17** (14 days post-deconcentration).
- [ ] **H3** — Apply the H2 decision: update `portfolio.md` Approved Instruments + write the rebalance plan (depends H2).

---

## Phase B — IBKR ops residual

- [x] B1–B4 — shipped
- [ ] **B5** — Operator: keep IBKR session warm; respond to keepalive 2FA alerts. Recurring ops, no engineering.

---

## Phase D — Parked product/domain explorations

- [ ] D1 — FX cash reconciliation (parked — reactivate only if live ops becomes confused)
- [ ] D2 — Control UI direct embedding (parked — editable source not yet available)
- [ ] D3 — EM ex-China sleeve (parked — no physical Acc UCITS resolves on IBKR feed)
- ~~D4 — Spitex transfer themes~~ (out of scope — separate surface)

---

## Open decisions — Graham, this is what I need from you

See **`docs/decisions-pending.md`** for the consolidated decision surface with bb8's recommendations.

When you say "go", the autonomous engineering surface I will work on is **Phase I (I1 → I2 → I3)**. Everything else is calendar-time-gated, operator-gated, or explicitly parked.

## Recommended next-action order (autonomous batch)

1. **I1** — fix the lifecycle counter (eliminates the recurring false `attention` state).
2. **I2** — health-trend.jsonl append.
3. **I3** — dashboard surfacing.
4. Verify: `npm run test:safe` green, `node scripts/run-health-check.js portfolio/etf` returns `state: healthy`, `scripts/show-dashboard.js etf` shows the new health-trail line.
5. Archive `CURRENT_PLAN.md` Phase I to `archive/phase-plans/2026-06-XX-phase-i/` on completion.
