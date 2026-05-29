# Phase V2 — Portfolio Accuracy, Basket Hardening & Session Resilience

**Created:** 2026-05-29 12:25 UTC
**Trigger:** Graham's review of today's basket execution session

---

## Problem Statement

Four categories of issues surfaced during today's Asia/UK diversification deployment:

### 1. Incorrect all-time P&L (critical)
- Dashboard shows +0.69% / +CHF 380 all-time on a CHF 93'858 portfolio
- Graham invested ~CHF 90'000 total, so the real gain is ~CHF 3'858 (+4.3%)
- **Root cause:** Cost-basis coverage is only 4/9 holdings. The `enrichHoldings()` function computes profit only from holdings that have cost-basis data (either from trades.md filled rows or IBKR avg-cost fallback). The 5 uncovered holdings have no cost basis, so their profit is excluded from the total.
- **Why avg-cost fallback fails for 5 holdings:** The `avgCostByKey` lookup uses `tickerOrIsin` or `symbol` as the key, but holdings.md stores conids (e.g. `78767919`) while the avg-cost map may be keyed by symbol (`CEBL`). Mismatch → no fallback → no cost basis.
- **Secondary issue:** Even if all 9 holdings had cost basis, the "all-time" figure would be unrealized P&L on current positions only — it wouldn't account for realized gains/losses from closed positions or cash drag. A true all-time return needs: `(current portfolio value) - (total capital deposited)`.

### 2. Tick-size rejections (fixed, needs hardening)
- CEBL and UBSSLI orders were rejected 4 times before the fix
- **Root cause (fixed):** `pickTick()` used static tick sizes (0.05 CHF, 0.01 EUR) instead of IBKR's price-dependent market rule 1874
- **Fix applied:** `pickTick()` now uses the full market rule 1874 table (commit `ddc67d8`)
- **Remaining hardening needed:**
  - Pre-flight tick validation before transmitting any order
  - Fetch actual `minTick` + `marketRuleIds` from contract details at proposal time
  - Log the tick used and validate `limitPrice % tick == 0` before submission

### 3. Basket execution fragility
- First execution attempt failed (expired proposal envelope from yesterday)
- Notification emails: only 1 of 6 fills sent (mirror deduplication bug)
- `legAlreadyMirrored()` matched on stale `brokerOrderId: 9149` that was incorrectly stamped on 52 old rows
- Orders marked "no longer open" after 5s but actually rejected (runner can't distinguish fill from rejection in the monitoring window)
- **Issues to fix:**
  - Runner should check execution evidence (not just "order left open-orders list") to confirm fills
  - `legAlreadyMirrored()` should match on `(instrument, brokerOrderId)` not just `brokerOrderId`
  - Old corrupted rows with wrong order IDs need cleanup
  - Proposal expiry should be checked before the approval gate, not after

### 4. Context compaction / session memory loss
- During long sessions, context compaction drops critical state (approved basket details, execution progress, what's been done vs pending)
- **Mitigations:**
  - Write execution state to files before long operations
  - Use daily memory notes more aggressively during multi-step work
  - Write a "session state" checkpoint file for complex multi-step operations
  - Keep the combine-harvester pattern for multi-hour work

---

## Plan

### Layer 1: Fix all-time P&L calculation (critical)

**Goal:** Dashboard shows accurate total return based on capital invested vs current value.

**Approach A (simple, accurate):** Track total capital deposited in `portfolio.md` as a metadata field. All-time return = `(current value - total deposited) / total deposited`.

**Approach B (detailed):** Fix cost-basis coverage for all 9 holdings so per-position P&L is accurate, then sum.

**Recommendation:** Do both. Approach A gives the correct headline number immediately. Approach B gives per-position detail.

**Tasks:**
1. Add `Total capital deposited CHF: 90000` to `portfolio/etf/portfolio.md` metadata
2. Update `show-dashboard.js` to compute all-time from `(total - deposited) / deposited` when available
3. Fix `enrichHoldings()` avg-cost fallback key matching (conid → symbol resolution)
4. Verify all 9 holdings get cost-basis coverage from IBKR avg-cost data
5. Update dashboard generator to show both "portfolio return" and per-position P&L

**Files:**
- `portfolio/etf/portfolio.md` — add deposited capital field
- `scripts/show-dashboard.js` — use deposited capital for headline return
- `src/reporting/costBasis.js` — fix avgCostByKey lookup
- `src/reporting/dashboardGenerator.js` — emit deposited-capital-based return
- `scripts/sync-interactive-brokers-holdings.js` — pass avg-cost data keyed by both conid and symbol

### Layer 2: Harden tick-size handling

**Goal:** Orders never get rejected for tick-size violations.

**Tasks:**
1. At proposal time, fetch contract details and store `marketRuleId` + resolved tick on each leg
2. Add pre-flight validation in the basket runner: assert `limitPrice % tick == 0` before transmitting
3. If validation fails, auto-round to nearest valid tick (ceil) and log a warning
4. Add a test that verifies all price bands in market rule 1874 produce valid limits
5. Consider caching contract details (they rarely change) to avoid extra API calls

**Files:**
- `src/execution/basketProposalGenerator.js` — fetch + store tick per leg
- `src/execution/basketExecutionRunner.js` — pre-flight tick validation
- `src/execution/basketReproposalBuilder.js` — already fixed, add edge-case tests
- `scripts/test-tick-size-validation.js` — new test

### Layer 3: Harden basket execution lifecycle

**Goal:** Basket execution is reliable, fills are correctly detected, notifications work.

**Tasks:**
1. **Fill detection:** After "order no longer open", check executions endpoint to confirm fill vs rejection. If no execution found, mark as `rejected` not `submitted`.
2. **Mirror deduplication:** Change `legAlreadyMirrored()` to match on `(instrument, brokerOrderId)` pair, not just `brokerOrderId` alone.
3. **Stale order ID cleanup:** Write a one-time migration to fix the 52 rows with incorrect `brokerOrderId: 9149`.
4. **Proposal expiry:** Check proposal age BEFORE the approval gate (fail fast with clear message).
5. **Notification backfill:** After basket execution, trigger notification for all fills that didn't get emailed.
6. **Runner timeout:** Extend the monitoring window from 5s to 30s for orders that leave the book (some fills take time to appear in executions).

**Files:**
- `src/execution/basketLifecycle.js` — fill detection, notification logic
- `src/execution/basketTradesMirror.js` — fix `legAlreadyMirrored()`
- `src/execution/basketExecutionRunner.js` — monitoring window, fill confirmation
- `scripts/execute-approved-basket-end-to-end.js` — proposal expiry pre-check
- `scripts/fix-stale-order-ids.js` — one-time migration (new)

### Layer 4: Session resilience / context compaction

**Goal:** Critical state survives context compaction during long multi-step operations.

**Tasks:**
1. **Execution checkpoint file:** Before starting basket execution, write `runtime/session-state.json` with: what's approved, what's been submitted, what's filled, what's pending. Read it back after compaction.
2. **Daily memory discipline:** After each significant action (basket fill, code fix, deployment), append to `memory/YYYY-MM-DD.md` immediately — don't batch.
3. **Combine-harvester for multi-step ops:** For operations spanning >30 minutes or >5 tool calls, create a harvester file tracking progress.
4. **Plan file as source of truth:** Keep this plan file updated with checkboxes as work completes. After compaction, re-read the plan to recover state.

**Files:**
- `runtime/session-state.json` — execution checkpoint (new pattern)
- `memory/2026-05-29.md` — immediate updates
- This plan file — progress tracking

---

## Execution Order

1. **Layer 1** (P&L fix) — highest user-visible impact, straightforward
2. **Layer 2** (tick hardening) — prevents future order rejections
3. **Layer 3** (basket lifecycle) — prevents notification gaps and stale state
4. **Layer 4** (session resilience) — process improvement, ongoing

## Success Criteria

- [ ] Dashboard shows ~+4.3% all-time (not 0.69%)
- [ ] All 9 holdings have cost-basis coverage
- [ ] `Total capital deposited` field in portfolio.md
- [ ] Pre-flight tick validation prevents invalid limit prices
- [ ] Basket runner correctly distinguishes fills from rejections
- [ ] All fills generate notification emails
- [ ] Session state checkpoint written before long operations
- [ ] Tests pass for all changes

---

## Reference

- Tick-size fix commit: `ddc67d8`
- Market rule 1874 source: `reqMarketRule(1874)` via native IBKR API
- Today's execution log: orders 9142-9151, 6 fills, 4 rejections
- Cost-basis module: `src/reporting/costBasis.js`
- Dashboard source: `scripts/show-dashboard.js`, `src/reporting/dashboardGenerator.js`
