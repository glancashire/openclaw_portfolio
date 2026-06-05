# PLAN — Portfolio Manager (consolidated)

**Last refreshed:** 2026-06-05 10:25 UTC · **Repo head:** see `git log -1` · **Tests:** 254/254 safe lane · **Health:** 🟢 healthy

Single active plan document. Older plans are in `archive/phase-plans/`. Daily operational state lives in `STATUS.md`. Per-portfolio facts live in `MEMORY.md`. Risk audit is at `docs/risk-audit-2026-06-05.md`.

---

## Visual roadmap

```text
Phase L   Risk hardening (live-money safeguards)     [STARTED] ████████░░  L0 done; L1 ready to execute
Phase H   Allocation rebalance decision (H2 + H3)    [WAITING] █████████░  CALENDAR  — 2026-06-17
Phase F4  IBKR XLS backfill                          [WAITING] █████████░  OPERATOR  — wait for XLS drop
Phase G3  Deposits XLS reference backfill            [WAITING] █████████░  OPERATOR  — same XLS as F4
Phase B5  IBKR keepalive 2FA                         [WAITING] █████████░  RECURRING — no engineering
Phase D1  FX cash reconciliation                     [PARKED]  █░░░░░░░░░  reactivate explicitly
Phase D2  Control UI direct embedding                [PARKED]  █░░░░░░░░░  upstream not available
Phase D3  EM ex-China sleeve                         [PARKED]  █░░░░░░░░░  no Acc UCITS on IBKR
```

**Shipped today (2026-06-05):** Phase K (energy + nuclear sleeve, all 3 legs filled) and Phase L0 (pre-flight order safeguards).

**Autonomous engineering ready right now:** Phase L1 batches A–E. Everything else is waiting on operator action, calendar, or explicit reactivation.

---

## Phase L — Risk hardening (live-money safeguards)

**Status:** STARTED · L0 shipped 2026-06-05; L1 ready

Goal: make live-money execution safe enough for higher capital. Full gap analysis at `docs/risk-audit-2026-06-05.md`.

### L0 (P0) — pre-flight order safeguards · DONE 2026-06-05

- [x] SELL price floor (refuse limit > 5% below bid)
- [x] BUY price ceiling (refuse limit > 5% above ask)
- [x] Per-leg notional cap (CHF 25k) + per-basket cap (CHF 50k)
- [x] Stale/crossed quote guard (bid<=0, ask<=0, bid>ask)
- [x] Envelope-level `sellApproved` flag (any SELL leg requires it)
- [x] Max 10 legs per basket
- [x] Wired into `executeApprovedBasket()` and the e2e runner
- [x] 12 tests in `tests/test-orderSafeguards.js` (all green)
- [x] Fix `Require user approval for sales` parser-stale value in `portfolio.md`
- [x] Risk audit doc `docs/risk-audit-2026-06-05.md`

### L1 (P1) — autonomous execution batches

- [ ] **L1.A** Delete approval-intent file after `executeApprovedBasket` returns (intent reuse hardening)
- [ ] **L1.B** Daily transmit cap (CHF 50k/day across all baskets, reads `runtime/basket-runs/etf/`)
- [ ] **L1.C** Tighten cron `toolsAllow` lists (remove unnecessary `write`/`edit`/`exec`)
- [ ] **L1.D** Wire trend guard into basket runner (block BUY if up >3% on day)
- [ ] **L1.E** Operator runbook: IBKR view-only API for read paths, scoped trading API key

### L2 (P2) — capital-gated, defer until > CHF 250k

- [ ] **L2.A** Sign portfolio.md + memory/*.md so agent can detect tampering
- [ ] **L2.B** Daily loss circuit breaker (freeze transmit if intra-day NLV drops X%)
- [ ] **L2.C** Multi-party approval for baskets > CHF 25k
- [ ] **L2.D** YubiKey / hardware-backed safe-word
- [ ] **L2.E** Monthly disaster-recovery drill (operations runbook addition)

---

## Phase H — Allocation rebalance decision

**Status:** WAITING · earliest review 2026-06-17

- [x] **H1** Baseline frozen at `docs/research/h1-allocation-baseline-2026-06-03.json`
- [ ] **H2** Pick path A (no change) / B (light deconcentration) / C (full rotation) for SXR8 + EMUAA
- [ ] **H3** Apply H2 decision to `portfolio.md`

---

## Phase F4 — IBKR XLS backfill

**Status:** WAITING · operator action required

- [ ] Drop a transactions XLS in `runtime/ibkr-statements/inbox/`
- [ ] Confirm 2026-06-03 + 2026-06-05 deposits reconciled
- [ ] Backfill reference numbers into `deposits.md`
- [ ] Close F4 + G3

---

## Phase G3 — Deposits XLS reference backfill

**Status:** WAITING · same XLS unblocks F4 + G3

- [ ] Wait for the XLS drop
- [ ] Re-run `node scripts/process-ibkr-statement-inbox.js --portfolio=etf`
- [ ] Verify reference numbers populated in `deposits.md`

---

## Phase B5 — IBKR keepalive 2FA

**Status:** WAITING · recurring operator action

- [ ] Respond to alerts when they fire (no engineering work)
- [ ] No code changes required

---

## Phase D1 — FX cash reconciliation

**Status:** PARKED · no action unless reactivating

- [ ] Reactivate only if live ops are confused by FX cash differences

---

## Phase D2 — Control UI direct embedding

**Status:** PARKED · upstream blocker

- [ ] Reactivate when OpenClaw upstream Control UI gets the embedding hook

---

## Phase D3 — EM ex-China sleeve

**Status:** PARKED · instrument unavailable

- [ ] Reactivate if a physical Acc UCITS for EM ex-China appears on IBKR feed

---

## What just shipped (filtered out of active plan)

| Phase | Result | Where |
|---|---|---|
| K — Energy/nuclear sleeve | ✅ Shipped 2026-06-05 09:00 UTC. XDWE+NUCL+INRE filled at ~6% sleeve. | `memory/2026-06-05.md`, `runtime/basket-runs/etf/basket-etf-20260605T0855-energy-sleeve.json` |
| L0 — Pre-flight order safeguards | ✅ Shipped 2026-06-05 09:30 UTC. | `src/execution/orderSafeguards.js`, `tests/test-orderSafeguards.js`, commit `115a9ef` |
| J — Second-pass autofix | ✅ | `archive/phase-plans/2026-06-04-g2-and-j/` |
| G2 — Deposits inbox cron | ✅ | same |
| I — Health lifecycle counter + trend | ✅ | `archive/phase-plans/2026-06-04-phase-i-health-followon/` |
| Sentry integration + autofix cron | ✅ | `archive/phase-plans/2026-06-04-sentry-and-health-monitor/` |
| Health-monitor v2 (state field, persistence, rate-limit) | ✅ | same |
| Stale-order reconciliation + terminal not_found | ✅ | same |
| Fill-monitor cron policy lock-in | ✅ | `MEMORY.md` |
| Decisions D-1/D-2/D-3/D-4 | ✅ | `archive/phase-plans/2026-06-04-g2-and-j/` |
| All earlier phases A, B, C, F, G | ✅ | `archive/phase-plans/2026-06-03-*` |
| All consolidated phases 1–200+ | ✅ | `archive/phase-plans/master-plan-204-212-refined.md`, `ALL_PHASE_PLANS_CONSOLIDATED.md` |

---

## Health at a glance

| Lane | State |
|---|---|
| ETF portfolio read/report path | 🟢 healthy |
| IBKR socket / auth / read | 🟢 green |
| Live order submission | 🟢 unblocked + safeguarded (Phase L0) |
| Holdings sync | 🟢 functional |
| Dashboard / report emails | 🟢 healthy |
| Fill-confirmation emails | 🟢 healthy (`monitor-fills` cron disabled by policy) |
| Deposits ledger | 🟢 10 deposits, CHF 150k cumulative |
| Health monitor | 🟢 escalation-only, persistence + 24h rate-limit |
| Sentry error tracking | 🟢 live, weekly autofix Mon 09:00 CET |
| Safe-lane verification | 🟢 254/254 (incl 12 new safeguard tests + 5 intent-cleanup tests) |
| Cron jobs | 🟢 11 enabled + 1 policy-disabled |

---

## Decisions you (Graham) need to make

| # | Decision | Recommendation | Cost of waiting |
|---|---|---|---|
| **D-1** | Run Phase L1 batches A–E now? | ✅ **YES, today.** Each is small, reversible, and improves the safety story before any future SELL or larger BUY. | Low for current CHF 150k; rises with capital. |
| **D-2** | Run Phase L2 (file signing, daily-loss circuit breaker, multi-party approval)? | ⏸ Defer until capital > CHF 250k or 3 months of clean ops. | Low — belt-and-suspenders. |
| **D-3** | IBKR API scoping (L1.E) — write the runbook, then you click? | ✅ **YES, write the runbook.** One-time 15-min op task that materially shrinks blast radius. | Medium-high — scoped API keys are the only thing stopping a full liquidation if `.env` ever leaks. |
| **D-4** | Phase H2 — pre-draft the rebalance recommendation, or wait for 2026-06-17? | ⏸ Wait — pre-drafting risks anchoring. | None. |
| **D-5** | Re-enable fill-monitor cron (`d4c3207d`) for the next 24h? | ⏸ Skip — all 3 legs already filled and reconciled. | None. |
| **D-6** | Reactivate parked D1/D2/D3? | ⏸ Keep parked. No external trigger has changed. | None. |
| **D-7** | Next thematic sleeve to research after energy/nuclear? | 💬 Up to you (water, defence, biotech, AI infra, commodities). | None. |

### My single strongest recommendation

**Say "go on L1"** — I run all five batches end-to-end and report back. After that, the safety posture is comfortable for CHF 500k+ without me needing to recommend more code-level guards.

---

## Quick refs (operator)

```bash
# Reporting + diagnostics (read-only)
node scripts/show-dashboard.js etf
node scripts/run-health-check.js portfolio/etf
node scripts/regenerate-dashboard-email-preview.js etf
node scripts/process-ibkr-statement-inbox.js --portfolio=etf --dry-run

# Live execution (requires safe-word)
node scripts/approve-and-execute.js --approval-id=<id> --secret=<safeword> --portfolio=etf

# Cron lifecycle (fill monitor — only during live execution)
openclaw cron enable d4c3207d-9e03-4e98-85eb-2eff38f50d4d
openclaw cron disable d4c3207d-9e03-4e98-85eb-2eff38f50d4d

# Tests
npm run test:all -- --lane=safe                       # full safe lane
node --test tests/test-orderSafeguards.js             # safeguards
node --test tests/test-approval-intent-cleanup.js     # L1.A intent cleanup
```

---

## What's NOT in this plan

- Anything fully shipped is in `archive/phase-plans/` and `MEMORY.md`.
- Daily operational state is in `STATUS.md`.
- Per-portfolio facts (capital, holdings, deposits) are in `MEMORY.md` and `portfolio/etf/`.
- The full risk gap analysis with code line numbers is in `docs/risk-audit-2026-06-05.md`.
- Earlier scrap plans (`CURRENT_PLAN.md`, `docs/decisions-pending.md`) have been moved to `archive/phase-plans/2026-06-05-superseded/`.
