# Current Plan

**Date:** 2026-06-03 (refreshed 16:24 UTC)
**Repo head:** `cf56f87` ("fills: prefer canonical approvedInstruments name in fill emails")
**Tests:** `npm test` 23/23 · `npm run test:safe` 242/242

## Visual roadmap

```text
Phase F  Fill-pipeline observability + retry       [STARTED]    █████████░
Phase G  Deposits ledger close-out                 [STARTED]    █████░░░░░
Phase H  Allocation-target decision                [STARTED]    ███░░░░░░░
Phase B  IBKR ops residuals                        [WAITING]    ████████░░
Phase D  Parked product/domain explorations        [PARKED]     █░░░░░░░░░
```

Live engineering work fits in Phases F + G. Phase H is data-gated. Phase B has one operator-owned residual but live trading is no longer blocked. Phase D is decisional, not engineering.

## Document map (only what is current)

| File | Role |
|---|---|
| `CURRENT_PLAN.md` (this file) | Open work + decisions |
| `STATUS.md` | Operational health snapshot |
| `SPECIFICATION.md` | System contract |
| `MEMORY.md` + `memory/YYYY-MM-DD.md` | Durable memory + daily notes |
| `playbook.md` | Project skills + reusable patterns |
| `docs/operations/*.md` | Operator runbooks (cron, IBKR recovery, host contract) |
| `archive/phase-plans/**` | All completed/historical plans |

Anything not in this list should be considered historical.

## Filter — what dropped off because it is done

- All Phase 1–4, A1–A3, C work (archived 2026-06-03)
- Email theme light-only · deposits ledger v1+v2 · ETF research doc
- 20k Mag-7 deconcentration basket: built, approved, executed live
- Per-instrument descriptions in P/L card (commit `dcc971d`)
- Readiness ISIN↔conid bridge + `monitor-fills` cron (commit `a51a0d3`)
- Canonical instrument-name fix in fill emails (commit `cf56f87`)

These all live in `archive/phase-plans/2026-06-03-*` with READMEs.

---

## Phase F — Fill-pipeline observability and retry
**Status:** STARTED

**Why this phase exists.** Today's 20k execution exposed three layers of silent fill-email defer. Two have been fixed (commits `a51a0d3`, `cf56f87`). The retry loop is now scheduled. Three smaller closures remain to make the loop fully self-healing.

- [x] F1 — ISIN ↔ conid identity bridge in `lib/tradeNotificationEmail.js` + unit test (`a51a0d3`)
- [x] F2 — `monitor-fills` cron `*/15 7-21 * * 1-5 UTC`, current-session, delivery=none (`a51a0d3`)
- [x] F3 — Canonical-name precedence fix (`approvedInstrument` over `holdingsMatch`) (`cf56f87`)
- [ ] F4 — Backfill 2026-06-03 deposits ledger reference once IBKR XLS arrives (operator-driven)
- [x] F5 — Soak-watch: validated end-to-end with 4 live fills + 3 cron passes with zero deferred fills
- [x] F6 — Retired `basketLifecycle.js` deferred-email comment; reason renamed to `deferred_to_monitor_fills_cron` (`61091f9`)

---

## Phase G — Deposits ledger close-out
**Status:** WAITING

**Why this phase exists.** The ledger landed today (Phase A1+A2+A3) and is now feeding the digest hero. The 2026-06-03 row uses a `pending_ibkr_xls` placeholder for the broker reference. Two CLI ergonomics tasks were deferred from A2.

- [x] G1 — `import-ibkr-deposits.js` dedup + footer rebuild + `--dry-run` (Phase A2)
- [ ] G2 — Wire `import-ibkr-deposits.js` into the daily-sync cron once XLS path is stable (depends G3)
- [ ] G3 — Backfill `pending_ibkr_xls` reference for 2026-06-03 row when XLS arrives (operator-driven)
- [x] G4 — Deposits-ledger lifecycle documented in `docs/operator-runbooks.md` (`3f86412`)

---

## Phase H — Allocation-target decision (Mag-7 deconcentration follow-up)
**Status:** WAITING

**Why this phase exists.** Today's basket added four new ETFs (XDEW, MWEQ, IS3H, DXS0) with provisional targets. The user explicitly deferred whether these stay additive or replace the legacy SXR8/EMUAA slots until 1-2 weeks of behavior data is in.

- [x] H1 — Baseline captured: `docs/research/h1-baseline-2026-06-03.json` + summary (`ac749da`)
- [ ] H2 — Decide path A (additive targets, keep SXR8 + EMUAA) vs path B (replace legacy slots) (needs H1 data, review date 2026-06-17)
- [ ] H3 — Apply the decision: update `portfolio.md` Approved Instruments + write the rebalance plan (depends H2)

---

## Phase B — IBKR ops residuals
**Status:** WAITING

**Why this phase exists.** Until today this was the live-trading blocker. Quote posture is now `live_or_realtime` and we executed 20k live; the only remaining items are operator-side maintenance.

- [x] B1 — Quote posture green (live execution today)
- [x] B2 — Read/report path stable
- [x] B3 — Recovery runbook published in `docs/operations/ibkr-recovery.md`
- [x] B4 — Native-gateway daytime keepalive + 2FA alert
- [ ] B5 — Operator: keep IBKR session warm; respond to keepalive 2FA alerts (recurring ops, no engineering)

---

## Phase D — Parked product/domain explorations
**Status:** PARKED

- [ ] D1 — FX cash reconciliation (parked — reactivate only if live ops becomes confused)
- [ ] D2 — Control UI direct embedding (parked — editable source not yet available)
- [ ] D3 — EM ex-China sleeve (parked — no physical Acc UCITS resolves on IBKR feed)
- ~~D4 — Spitex transfer themes~~ (out of scope — separate surface)

---

## Open decisions — Graham, this is what I need from you

1. **Phase F4/G3 — IBKR XLS backfill window.** Recommendation: leave `pending_ibkr_xls` placeholder as-is until next routine login pulls the XLS; backfill in the next session. **Decision needed only if you want me to chase the XLS proactively.**
2. **Phase F6 — Cleanup the deferred-email comment block in `lib/tradeExecutionNotifier.js`.** Recommendation: yes, low-risk drive-by cleanup once Phase F5 (soak watch) confirms no deferred fills for 3 consecutive market days. **Decision: green-light F6 after F5 passes? (default yes)**
3. **Phase G4 — Doc the deposits-ledger lifecycle.** Recommendation: yes, ~30 min of writing under `docs/operator-runbooks.md`. **Decision: include in the next autonomous run? (default yes)**
4. **Phase H2 — Allocation path A vs B.** Recommendation: defer 1-2 weeks per your earlier instruction. **Decision: confirm H1 collection start date is today 2026-06-03 (i.e., earliest review = 2026-06-17).**
5. **Phase B5 — IBKR keepalive operator action.** Already has cron alerting; no new decision unless you want a different cadence.

When you say "go", the autonomous engineering surface is **F5 + F6 + G4** (with H1 running in the background and not requiring action until ~2026-06-17). F4/G3 wait on the XLS, B5 is operator-side, D is locked parked.

## Recommended next-action order

1. F5 — let `monitor-fills` cron run for 3 market days, watch for `deferred:` lines (passive)
2. G4 — write deposits-ledger lifecycle section in `docs/operator-runbooks.md` (~30 min)
3. F6 — once F5 is clean, retire the `basketLifecycle.js` deferred-email comment + adjacent dead push
4. (Wait on H1 data)
5. F4/G3 — backfill XLS reference next time it lands

If Graham gives a single "go", I will start with G4 since it is the only purely-deterministic engineering task that does not need calendar time or external artefacts.
