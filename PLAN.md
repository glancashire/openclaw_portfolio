# PLAN — Portfolio Manager (consolidated)

**Last refreshed:** 2026-06-05 09:30 UTC · **Repo head:** see `git log -1` · **Tests:** 254/254 safe lane · **Health:** 🟢 healthy

This is the single active plan document. Older plans are at `archive/phase-plans/`. Daily operational state lives in `STATUS.md`. Per-portfolio facts live in `MEMORY.md`.

---

## 1. Visual roadmap

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  WORK STATE OVERVIEW                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│  Phase L  Risk hardening (live-money safeguards)    [80% DONE]   ▶ P1    │
│  Phase H  Allocation rebalance (H2/H3 review)       [WAITING]    📅 6/17 │
│  Phase F4 IBKR XLS backfill                         [WAITING]    👤 op   │
│  Phase G3 Deposits XLS reference backfill           [WAITING]    👤 op   │
│  Phase B5 IBKR keepalive 2FA                        [RECURRING]  👤 op   │
│  Phase D1 FX cash reconciliation                    [PARKED]     ⏸       │
│  Phase D2 Control UI direct embedding               [PARKED]     ⏸       │
│  Phase D3 EM ex-China sleeve                        [PARKED]     ⏸       │
│                                                                          │
│  Phase K  Energy + nuclear sleeve                   [✅ SHIPPED today]   │
│  All phases A–J + earlier (Sentry, health, fills,                        │
│    deposits, autofix, etc.)                         [✅ ARCHIVED]        │
└──────────────────────────────────────────────────────────────────────────┘

Legend: ▶ ready for autonomous execution on Graham's go
        📅 calendar-gated  👤 needs operator action  ⏸ parked
```

**Autonomous engineering ready right now:** Phase L P1 items (see § 5 below). Everything else is waiting on operator action, calendar, or explicit reactivation.

---

## 2. Active phases (open work)

### Phase L — Risk hardening 🆕 (started 2026-06-05)

Goal: make live-money execution safe enough for higher capital.

- [x] **L0** — Add price-floor for SELL limits (refuse > 5% below bid)
- [x] **L0** — Add price-ceiling for BUY limits (refuse > 5% above ask)
- [x] **L0** — Add per-leg + per-basket notional caps (CHF 25k / CHF 50k)
- [x] **L0** — Add stale/crossed quote guard
- [x] **L0** — Add envelope-level `sellApproved` flag (any SELL leg requires it)
- [x] **L0** — Wire safeguards into `executeApprovedBasket()` and `execute-approved-basket-end-to-end.js`
- [x] **L0** — Fix `Require user approval for sales` parser-stale value in `portfolio.md`
- [x] **L0** — Tests (`tests/test-orderSafeguards.js`, 12 tests)
- [x] **L0** — Risk audit doc at `docs/risk-audit-2026-06-05.md`
- [ ] **L1** — Delete approval-intent file after `executeApprovedBasket` returns (intent reuse hardening)
- [ ] **L1** — Daily transmit cap (CHF 50k/day across all baskets, reads `runtime/basket-runs/etf/`)
- [ ] **L1** — Tighten cron `toolsAllow` lists (remove unnecessary `write`/`edit`/`exec`)
- [ ] **L1** — Wire trend guard into basket runner (block BUY if up >3% on day)
- [ ] **L1** — Operator action: enable IBKR view-only API for read paths, scope trading API to a separate key
- [ ] **L2** — Sign portfolio.md + memory/*.md so agent can detect tampering
- [ ] **L2** — Daily loss circuit breaker (freeze transmit if intra-day NLV drops X%)
- [ ] **L2** — Multi-party approval for baskets > CHF 25k
- [ ] **L2** — YubiKey / hardware-backed safe-word (only if capital > CHF 500k)
- [ ] **L2** — Monthly disaster-recovery drill (operations runbook addition)

**Source-of-truth doc:** `docs/risk-audit-2026-06-05.md` (full gap analysis + recommendations)

### Phase H — Allocation rebalance decision (📅 calendar-gated)

Earliest review date: **2026-06-17**. Baseline anchor: `docs/research/h1-baseline-2026-06-03.json`.

- [x] **H1** — Baseline frozen
- [ ] **H2** — Pick path A (no change) / B (light deconcentration) / C (full rotation) for SXR8 + EMUAA vs deconcentration ETFs
- [ ] **H3** — Apply H2 decision to `portfolio.md`

### Phase F4 + G3 — IBKR XLS backfill (👤 single operator action unblocks both)

- [ ] **You** drop a transactions XLS in `runtime/ibkr-statements/inbox/`
- [ ] bb8 confirms 2026-06-03 + 2026-06-05 deposits reconciled and reference numbers backfilled
- [ ] bb8 closes F4 + G3

### Phase B5 — IBKR keepalive 2FA (👤 recurring ops)

- [ ] **You** respond to alerts when they fire (no engineering work)

### Phase D — Legacy parked explorations (⏸ no action unless reactivating)

- [ ] **D1** — FX cash reconciliation — parked, reactivate only if live ops confused
- [ ] **D2** — Control UI direct embedding — parked, upstream not available
- [ ] **D3** — EM ex-China sleeve — parked, no physical Acc UCITS on IBKR feed

---

## 3. What just shipped (filtered out of active plan)

| Phase | Result | Where |
|---|---|---|
| K — Energy/nuclear sleeve | ✅ Shipped 2026-06-05 09:00 UTC. XDWE+NUCL+INRE filled at ~6% sleeve. | `memory/2026-06-05.md`, `runtime/basket-runs/etf/basket-etf-20260605T0855-energy-sleeve.json` |
| J — Second-pass autofix (5 fixers, 24h rate-limit) | ✅ | `archive/phase-plans/2026-06-04-g2-and-j/` |
| G2 — Deposits inbox cron | ✅ | `archive/phase-plans/2026-06-04-g2-and-j/` |
| I — Health lifecycle counter + trend | ✅ | `archive/phase-plans/2026-06-04-phase-i-health-followon/` |
| Sentry integration + autofix cron | ✅ | `archive/phase-plans/2026-06-04-sentry-and-health-monitor/` |
| Health-monitor v2 (state field, persistence, rate-limit) | ✅ | same |
| Stale-order reconciliation + terminal not_found | ✅ | `archive/phase-plans/2026-06-04-sentry-and-health-monitor/` |
| Fill-monitor cron policy lock-in | ✅ | `MEMORY.md` |
| Decisions D-1/D-2/D-3/D-4 | ✅ | `archive/phase-plans/2026-06-04-g2-and-j/` |
| All earlier phases A, B, C, F, G | ✅ | `archive/phase-plans/2026-06-03-*` |
| All consolidated phases 1-200+ | ✅ | `archive/phase-plans/master-plan-204-212-refined.md` and `archive/phase-plans/ALL_PHASE_PLANS_CONSOLIDATED.md` |

---

## 4. Health at a glance

| Lane | State |
|---|---|
| ETF portfolio read/report path | 🟢 healthy |
| IBKR socket / auth / read | 🟢 green |
| Live order submission | 🟢 unblocked + safeguarded (Phase L) |
| Holdings sync | 🟢 functional |
| Dashboard / report emails | 🟢 healthy |
| Fill-confirmation emails | 🟢 healthy (`monitor-fills` cron disabled by policy) |
| Deposits ledger | 🟢 10 deposits, CHF 150k cumulative |
| Health monitor | 🟢 escalation-only, persistence + 24h rate-limit |
| Sentry error tracking | 🟢 live, weekly autofix Mon 09:00 CET |
| Safe-lane verification | 🟢 254/254 passing (incl 12 new safeguard tests) |
| Cron jobs | 🟢 11 enabled + 1 policy-disabled |

---

## 5. Phased checklist — autonomous execution batches

When you say "go on Phase L1", I execute everything in that batch end-to-end and report back. Each item is small, reversible, and verifiable; nothing trades or moves money.

### Batch L1.A — Approval intent hygiene (P1)

- [ ] Modify `scripts/execute-approved-basket-end-to-end.js`: after the runner returns (success or failure), `fs.unlinkSync(intentPath)` and log the deletion. Only delete on actual transmit attempts (not reconcile-only).
- [ ] Add test `tests/test-approval-intent-cleanup.js` verifying the file is gone after a successful run.
- [ ] Update `docs/setup/approval-gate.md` to document the post-run cleanup.

**Verification:** safe lane green, manually trigger a dry-run path and verify intent file deleted.

### Batch L1.B — Daily transmit cap (P1)

- [ ] Add `src/execution/dailyTransmitCap.js` — reads `runtime/basket-runs/etf/*.json` modified today (UTC), sums total CHF transmitted, refuses if `> CHF 50k`.
- [ ] Wire into `executeApprovedBasket` before the per-leg loop.
- [ ] Add config knob `safeguardConfig.dailyTransmitCapChf` with default 50000.
- [ ] Tests for: zero transmits today (passes), at-cap (refuses), past day's transmits don't count.

### Batch L1.C — Tighten cron tool grants (P1)

- [ ] List all cron jobs → identify ones with `write`/`edit`/`exec` they don't need.
- [ ] Update each: keep only the minimum (`read` for diagnostics, `read+exec` for scripts that need shell calls, `read+exec+write` only where unavoidable).
- [ ] Re-test each cron's last-known-good run is still possible after tightening.

**Risk:** breaking a cron's normal operation. Mitigation: tighten one at a time, observe one cycle, then move to next.

### Batch L1.D — Trend guard in basket runner (P1)

- [ ] Reuse `src/execution/marketOpenPolicy.evaluateMarketOpenBlock()` from inside `executeApprovedBasket` for BUY legs, with `extremeMovePct: 3` default (configurable).
- [ ] Add `safeguardConfig.skipTrendGuard` escape hatch (operator override, logged).
- [ ] Tests: BUY leg with simulated +5% intraday move → blocked; BUY with +1% → passes.

### Batch L1.E — Operator handoff for IBKR API scoping (P1)

- [ ] Write `docs/setup/ibkr-api-scoping.md` with the exact IBKR Client Portal click-path to:
   - Create a separate API user with **view-only / market data only** permissions for read paths.
   - Lock the trading API key down to a separate user with `Trade` permission.
   - Test that the read-only key cannot place an order (negative test).
- [ ] Update `.env.example` to show the two-key pattern.

This is operator work (clicks in IBKR portal) — I write the runbook; you execute.

### Batch L2.A — File integrity (P2, defer until L1 complete)

- [ ] Add `scripts/sign-portfolio-files.js` — generate SHA-256 hashes of `portfolio/*/portfolio.md` + `MEMORY.md` + `memory/feedback_*.md` + `.env.example` and write to `runtime/file-integrity.json`.
- [ ] Add `scripts/check-portfolio-files-integrity.js` — verify hashes match. Cron daily at 06:00 UTC.
- [ ] Boot check in `executeApprovedBasket` — refuse if integrity check failed today.

### Batch L2.B — Daily loss circuit breaker (P2)

- [ ] Add `runtime/circuit-breakers/daily-loss-tripped.json` flag file pattern.
- [ ] Cron at 06:00, 14:00, 20:00 UTC: compare current NLV to today's open NLV; if drop > X% (default 5%), write trip flag.
- [ ] `executeApprovedBasket` refuses if trip flag is fresh (< 24h).
- [ ] Manual reset: `openclaw cron run reset-daily-loss-trip` or just delete the file.

### Batch L2.C — Multi-party approval for big baskets (P2)

- [ ] Any basket with `total_chf > 25000` requires TWO approvals from different channels (e.g. webchat + email confirmation).
- [ ] Approval intent file gains `approvers: [{channel, timestamp}]` array.
- [ ] Refuse to transmit unless `approvers.length >= 2` for big baskets.

---

## 6. Decisions you (Graham) need to make

These are the only choice points blocking autonomous execution. Pick any to unlock the corresponding batch.

| # | Decision | Recommendation | Cost of waiting |
|---|---|---|---|
| **D-1** | **Run Phase L1 batches A–E now?** | ✅ **YES, run all of L1 today.** Each is small, reversible, and improves the safety story significantly before any future SELL or larger BUY. | Low. Current Phase L0 is sufficient for today's CHF 150k position size, but L1 is prudent before the next big deposit or any rebalance involving sells. |
| **D-2** | **Run Phase L2 batches A–C** (file signing, daily-loss circuit breaker, multi-party approval)? | ⏸ **Defer until capital > CHF 250k or 3 months of clean ops.** Diminishing returns at current scale. | Low — these are belt-and-suspenders. |
| **D-3** | **IBKR API scoping (L1.E)** — do you want me to write the runbook, then you execute the clicks? | ✅ **YES, write the runbook.** This is a one-time 15-minute operator task that materially reduces blast radius if anything else gets compromised. | Medium-high — if the host or `.env` ever leaks, scoped API keys are the only thing stopping a full liquidation. |
| **D-4** | **Phase H2** — allocation rebalance review on 2026-06-17 — do you want me to draft a recommendation in advance, or wait for the date? | ⏸ **Wait for the date.** The June 17th data point matters for the recommendation; pre-drafting risks anchoring. | None. |
| **D-5** | **Re-enable fill-monitor cron** (`d4c3207d`) for the next ~24h to verify post-fill notifications for today's energy basket land cleanly? | ⏸ **Skip.** All three legs already filled and reconciled. Fill-monitor is most useful while orders are still pending. | None. |
| **D-6** | **Reactivate parked Phase D items (D1/D2/D3)?** | ⏸ **Keep parked.** No external trigger has changed since they were parked. | None. |
| **D-7** | **What's the next thematic sleeve to research after energy/nuclear?** Options people typically ask about: water, defence, biotech, AI infrastructure (already partly held via SEC0/AIFS/XAIX), commodities. | 💬 **Up to you.** I have no strong opinion until you do. | None. |

### My single strongest recommendation

**Say "go on L1" today.** L1.A through L1.E together take maybe 30-45 minutes of execution time, all green-lane changes (no money moves), and meaningfully improve the safety story for any future trade that's bigger or includes sells. After L1 is done, the system would be safe enough to handle CHF 500k+ without me needing to recommend more code-level guards.

---

## 7. Quick refs (operator)

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
npm run test:all -- --lane=safe   # full safe lane
node --test tests/test-orderSafeguards.js   # new safeguard tests
```

---

## 8. What's NOT in this plan

- Anything fully shipped is in `archive/phase-plans/` and `MEMORY.md`.
- Daily operational state is in `STATUS.md`.
- Per-portfolio facts (capital, holdings, deposits) are in `MEMORY.md` and `portfolio/etf/`.
- The full risk gap analysis with code line numbers is in `docs/risk-audit-2026-06-05.md`.
- Earlier scrap plans (`CURRENT_PLAN.md`, `docs/decisions-pending.md`) have been moved to `archive/phase-plans/2026-06-05-superseded/`.
