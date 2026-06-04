# Current Plan

**Date:** 2026-06-04 20:36 UTC
**Repo head:** `0ba9be7`
**Tests:** `npm run test:safe` 254/254 · **Health:** 🟢 healthy

---

## Visual roadmap (open + parked, completed work archived)

```text
                                                              BLOCKER       BB8 ACTION READY
─── OPEN ───────────────────────────────────────────────────────────────────────────
Phase H   Allocation rebalance decision (H2 + H3)             CALENDAR      ❌ wait until 2026-06-17
Phase F4  IBKR XLS backfill                                   OPERATOR      ❌ wait for XLS drop
Phase G3  Deposits XLS reference backfill                     OPERATOR      ❌ same XLS as F4
Phase B5  IBKR keepalive 2FA                                  RECURRING     ❌ no engineering

─── PARKED (research complete, awaiting decision) ──────────────────────────────────
Phase K   Energy + nuclear sleeve                             DECISION      🟡 stub + shortlist ready
                                                                            Cron probe Fri 13:00 UTC

─── PARKED (legacy explorations) ───────────────────────────────────────────────────
Phase D1  FX cash reconciliation                              PARKED        ❌ explicit reactivation
Phase D2  Control UI direct embedding                         PARKED        ❌ upstream not available
Phase D3  EM ex-China sleeve                                  PARKED        ❌ no Acc UCITS on IBKR
```

**Autonomous engineering ready to start: none.** Phase K has research + plan stub but needs your go-ahead.

---

## Phase H — Allocation rebalance decision (CALENDAR-GATED)

**Earliest review:** 2026-06-17 · **Baseline:** `docs/research/h1-baseline-2026-06-03.json`

- [x] H1 — baseline frozen
- [ ] **H2** — Pick path A / B / C for SXR8 + EMUAA vs the new deconcentration ETFs
- [ ] **H3** — Apply H2 decision to `portfolio.md`

---

## Phase F4 + G3 — IBKR XLS backfill (OPERATOR-GATED, single drop unblocks both)

- [ ] **You** drop a transactions XLS in `runtime/ibkr-statements/inbox/`
- [ ] bb8 confirms 2026-06-03 deposit reconciled
- [ ] bb8 closes F4 + G3

---

## Phase K — Energy + nuclear sleeve (DECISION-GATED)

**Status:** Research done. Plan stub written. Waiting for Graham's go/no-go.

**Final shortlist:**
| Role | Ticker | Venue | Conid | TER | AUM |
|---|---|---|---:|---:|---:|
| Broad energy | XDWE | Xetra EUR | 227263991 | 0.25% | €1.7bn |
| Nuclear | **NUCL** | **SIX CHF** 🌟 | 626090692 | 0.55% | €2.4bn |
| Clean energy (opt) | INRE | Paris EUR | 552352705 | 0.65% | €4bn |

- [x] Screening — `docs/research/energy-nuclear-screening-2026-06-04.md`
- [x] Preflight — `docs/research/energy-nuclear-preflight-2026-06-04.md` (conid + venue + close-snap quote + AUM)
- [x] K-series plan stub — `docs/research/k-series-energy-sleeve-stub.md`
- [x] Live-hours probe scheduled — cron `141064ee` runs Fri 2026-06-05 13:00 UTC, self-deletes
- [ ] **You** — decide: build the sleeve or park
- [ ] If go: lift K-series stub → `plans/phase-k1-energy-baseline.md` and run K1

---

## Phase B5 — IBKR keepalive 2FA (RECURRING OPS)

- [ ] **You** respond to alerts when they fire

---

## Phase D — Legacy parked explorations

- [ ] D1 — FX cash reconciliation
- [ ] D2 — Control UI direct embedding
- [ ] D3 — EM ex-China sleeve

---

## What is NOT in this plan

Anything fully shipped (Sentry, health-monitor simplification, Phase I lifecycle counter, Phase G2 deposits inbox, Phase J second-pass autofix, F6, G4, H1) is in `archive/phase-plans/`.

Operational state lives in `STATUS.md`. Pending operator decisions live in `docs/decisions-pending.md`.
