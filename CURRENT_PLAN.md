# Current Plan

**Date:** 2026-06-04 20:00 UTC
**Repo head:** `0a294ce`
**Tests:** `npm run test:safe` 254/254 · **Health:** 🟢 healthy

---

## Visual roadmap (open phases only — completed work archived)

```text
                         ──────── BLOCKER TYPE ────────
Phase H  Allocation rebalance decision     CALENDAR ░░░░░░░░░░  → 2026-06-17
Phase F4 IBKR XLS backfill                 OPERATOR ░░░░░░░░░░  → drop XLS in inbox
Phase G3 Deposits XLS reference backfill   OPERATOR ░░░░░░░░░░  → same XLS as F4
Phase B5 IBKR keepalive 2FA                RECURRING            → respond to alerts
Phase D  Parked explorations               PARKED   ░░░░░░░░░░  → reactivate explicitly
```

**There is no autonomous engineering work pending.** Every open item is gated on a human action, a calendar date, or explicit reactivation.

---

## Phase H — Allocation rebalance decision (CALENDAR-GATED)

**Earliest review:** 2026-06-17 (14 days post-deconcentration).
**Baseline anchor:** `docs/research/h1-baseline-2026-06-03.json`

### H2 — Decide allocation path
- [x] H1 — baseline frozen
- [ ] **H2** — Pick path A, B, or C for the 4 new ETFs alongside SXR8 + EMUAA
  - **Path A** — accept current concentration, no new ETFs
  - **Path B** — add 1–2 deconcentration ETFs, light rebalance
  - **Path C** — full rotation into the H1 mega-cap-screened set
- [ ] **H3** — Apply H2 decision to `portfolio.md`

### What bb8 will do once unblocked
1. Pull live IBKR prices + fresh holdings snapshot
2. Compare against H1 baseline drift bands
3. Generate a rebalance basket proposal under each path
4. Present side-by-side: cost, drift reduction, sector exposure delta
5. Wait for path selection, then build the basket and ask for approval

---

## Phase F4 + G3 — IBKR XLS backfill (OPERATOR-GATED)

**Single action unblocks both.** The 2026-06-03 deposit row carries `pending_ibkr_xls`.

- [ ] **F4 / G3** — Operator drops a transactions XLS into `runtime/ibkr-statements/inbox/`
  - Daily-sync cron picks it up automatically (Phase G2 wiring)
  - `import-ibkr-deposits` de-dupes by reference; safe to drop any range
  - Processed file moves to `runtime/ibkr-statements/archive/`

### What bb8 will do once unblocked
- Confirm row reconciled (`pending_ibkr_xls` cleared)
- Update `summary.json` and history snapshot
- Mark F4 + G3 closed

---

## Phase B5 — IBKR keepalive 2FA (RECURRING OPS)

- [ ] **B5** — Respond to keepalive 2FA prompts when they fire (no fixed cadence)

Not engineering work. Just a heads-up the cron is alive.

---

## Phase D — Parked explorations

These stay parked until you say "reactivate".

- [ ] **D1** — FX cash reconciliation (only if live ops get confused by FX cash)
- [ ] **D2** — Control UI direct embedding (waiting on upstream availability)
- [ ] **D3** — EM ex-China sleeve (no physical Acc UCITS on IBKR feed)

---

## What is NOT in this plan

Anything fully shipped (Sentry, health-monitor simplification, Phase I lifecycle counter, Phase G2 deposits inbox, Phase J second-pass autofix, F6, G4, H1) is in `archive/phase-plans/`. It does not need surface space here.

Operational state (cron jobs, test pass rates, health) is in `STATUS.md`. Pending operator decisions are in `docs/decisions-pending.md`.
