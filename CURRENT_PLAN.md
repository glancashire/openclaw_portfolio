# Current Plan

**Date:** 2026-06-03
**Status:** waiting on operator inputs + a few open decisions
**Repo head:** see `git log -1 --oneline` for the exact head

## Goal

Keep one short, truthful doc that captures **only the work that is still open or waiting**. Completed phases live in `archive/phase-plans/`. Historical roadmaps live in `archive/docs/`.

When Graham says "go", an autonomous run can pick up from this file alone.

---

## Visual roadmap

```text
Phase A  Deposits ledger maturity                       [ACTIVE / waiting decisions]  ████░░░░░░
Phase B  External unblockers (operator-owned gates)     [WAITING]                     ███░░░░░░░
Phase C  Counter freshness wiring                       [OPEN / small]                █░░░░░░░░░
Phase D  Parked product and domain explorations         [PARKED]                      █░░░░░░░░░
```

Completed phases (filtered out of the live roadmap, archived in full):

- Phase 1 — Operator surface cleanup and dashboard path cleanup ✅ 2026-06-02
- Phase 2 — Artifact hygiene and legacy surface retirement ✅ 2026-06-03
- Phase 3 — Usage and decision-support reporting ✅ 2026-06-03
- Phase 4 — OpenClaw maintainer contract ✅ 2026-06-03
- Email redesign (Themeforest light/dark, then forced light-only) ✅ 2026-06-03
- Deposits ledger initial wiring (digest hero + P/L strip uses `deposits.md`) ✅ 2026-06-03

Archive index: `archive/phase-plans/2026-06-03-completed/`.

---

## Phase A — Deposits ledger maturity
**Status:** ACTIVE (initial wiring landed; follow-ups open)

### Completed
- [x] `portfolio/etf/deposits.md` ledger imported from IBKR transactions report (8 deposits totaling 120,000 CHF).
- [x] `lib/depositsLedger.js` parser supports deposits + withdrawals.
- [x] Daily/weekly digest hero card now shows **Net deposited** instead of cost-basis "Invested" when ledger present.
- [x] P/L strip now shows **Total return vs deposits** (`value − net deposited`) with secondary line for unrealized-on-held-positions.
- [x] `dashboardDigest.js` (alternate render path) also wired to the ledger for parity.
- [x] Regression test `scripts/test-deposits-ledger.js` (8 entries, withdrawals, missing-file path).
- [x] All callers of `buildReportEmailHtml`/`Text` pass `portfolioDir` through (`send-dashboard-digest.js`, `deliveryExecutor.js`).

### Started / partially complete
- [ ] Backfill `history.md` "Invested CHF" column to use net-deposited instead of cost-basis. Currently the column shows held-positions cost basis (e.g. `121,633.74` on 2026-06-03) which is misleading once a ledger exists.

### Still open
- [ ] **Decision:** does the weekly/monthly investor email keep the same headline (Total return vs deposits) or do we want a different presentation for investors? Current default: same as digest.
- [ ] Multi-portfolio support: only `portfolio/etf/deposits.md` exists. If/when other portfolios become live, each one needs its own `deposits.md` (parser is portfolio-agnostic).
- [ ] Auto-import script: a small CLI that reads a fresh IBKR transactions XLS, dedups against existing references in `deposits.md`, appends new rows. Manual append works today; this is convenience.
- [ ] Withdrawal handling end-to-end test (no withdrawals exist yet in real data; library code path is covered by unit test only).
- [ ] Display: when a withdrawal exists, surface it explicitly in the digest ("Cumulative deposits 130k − withdrawals 10k = net 120k") rather than just showing net.

---

## Phase B — External unblockers and operator-owned gates
**Status:** WAITING (operator-side actions; not autonomous)

### Completed
- [x] IBKR readonly reporting and holdings-sync paths are stable for normal read/report operations.
- [x] Recovery guidance lives in `docs/operations/ibkr-recovery.md`.
- [x] Quote-posture failure narrowed to subscription/data-farm/operator-side diagnosis (not a generic read-path outage).

### Still open
- [ ] **Operator action:** complete IBKR runbook Step 6 and verify quote posture moves out of `unknown`.
- [ ] **Operator action:** re-test live order submission only after quote posture is healthy.
- [ ] **Decision:** Control UI direct embedding — truly blocked, or just still-undiscovered source territory? See `archive/docs/post-mvp-roadmap.md` for original scope.

---

## Phase C — Counter freshness wiring
**Status:** OPEN (small, ready for autonomous execution)

The Phase 3 usage counters live at `runtime/overview/usage-counters.json` and feed the digest's Operations KPI card. Today they're regenerated only on manual `node scripts/regenerate-usage-counters.js`. The digest reads the cached file. So if no one regenerates, the card slowly goes stale.

### Still open
- [ ] **Decision needed:** how should counters refresh?
  - Option (a): wire `regenerateUsageCounters()` into `send-dashboard-digest.js` so each daily send regenerates first. Simplest. Adds ~2s to the send.
  - Option (b): add a small cron job that regenerates 1×/day at 06:00 UTC, separate from the digest send. Cleaner separation of concerns. Adds one more cron job.
  - Option (c): leave manual. Document the helper in playbook and call it good. Lowest cost, slight risk of stale data.
- [ ] Implement chosen option, run safe lane, commit.

**Recommendation:** Option (a). One less cron job, deterministic with each send, the cost is trivial.

---

## Phase D — Parked product and domain explorations
**Status:** PARKED (not autonomous; operator owns reactivation)

### Items parked
- [ ] **Decision LOCKED 2026-06-03 — keep parked.** FX cash reconciliation: documented root cause; no fix staged. Reactivate only if live operator use becomes materially confused.
- [ ] **Decision LOCKED 2026-06-03 — keep parked.** Control UI direct embedding: target identified, editable source not yet available.
- ~~Spitex transfer themes~~ — out of scope for this repo (separate surface).

---

## Recommended execution order when Graham says go

1. **Phase A.history-backfill** (concrete, small, no external blockers).
2. **Phase A.auto-import** (small CLI; convenience).
3. **Phase C** (counter freshness; pick option a).
4. **Phase A.withdrawal-display** (only relevant once a withdrawal happens; defer otherwise).
5. **Phase B** (only after operator inputs land).
6. **Phase D** (only on explicit reactivation).

---

## Open decisions Graham must make

_All initially-open decisions were resolved on 2026-06-03 10:54 UTC; recommended
options accepted, Spitex removed as out-of-scope. Recorded here for audit trail._

1. **Phase A — investor email headline.** ✅ ACCEPTED — investor weekly/monthly inherits the same `reportEmail.js` builder; headline aligns automatically with the daily digest.
2. **Phase A — auto-import CLI scope.** ✅ ACCEPTED — build a small CLI to dedup/append fresh IBKR XLS deposit reports into `deposits.md`.
3. **Phase C — counter freshness.** ✅ ACCEPTED — option (a): wire `regenerateUsageCounters()` into `send-dashboard-digest.js`.
4. **Phase D — parked items.** ✅ ACCEPTED — keep all three parked. Spitex removed (out of scope).
5. **Phase B — IBKR runbook Step 6.** ✅ ACCEPTED — operator handles separately.