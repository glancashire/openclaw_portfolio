# Phase 46 — Integrate ETF Quality Filter + Smart Execution Defaults

## Goal
Wire the ETF quality filter into the trade proposal pipeline so no order can be placed for a synthetic or high-TER ETF. Default to smart execution (real-time pricing at market open) and reject order placement when markets are closed.

## Checklist

### 1. Market hours guard
- [ ] Create `lib/marketHours.js` with:
  - `isMarketOpen(exchange)` — returns true if current time is within trading hours
  - `nextOpenTime(exchange)` — returns next market open as ISO string
  - Covers EBS (09:00-17:30 CET) and common European exchanges
- [ ] Integrate guard into `scripts/submit-orders-at-open.js` — abort if market closed
- [ ] Integrate guard into `scripts/execute-trades.js` — abort if market closed (unless `--force`)

### 2. Wire quality filter into proposal pipeline
- [ ] Update `scripts/execute-trades.js` to call `validateTradeList()` before placing any order
- [ ] Update `scripts/submit-orders-at-open.js` to call `validateTradeList()` (already done, verify)
- [ ] Add quality check to `src/analysis/` trade proposal generation if it exists
- [ ] Reject with clear error message if any instrument fails

### 3. Smart execution as default
- [ ] `scripts/execute-trades.js`: if no `--force` flag and market is closed, print message and exit
- [ ] `scripts/submit-orders-at-open.js`: if market is closed, schedule a cron job for next open instead of failing
- [ ] Remove any code path that places GTC orders outside market hours without explicit override

### 4. Tests
- [ ] Test market hours guard (mock times for open/closed)
- [ ] Test quality filter rejection (add a synthetic ETF to trade list, verify rejection)
- [ ] Test that execute-trades refuses to run when market is closed
- [ ] Test that submit-orders-at-open works during market hours (dry-run)

## Exit criteria
- No order can be placed for a synthetic or high-TER ETF without explicit override
- No order is placed when markets are closed (clear error message instead)
- Smart execution is the default path
- All tests pass
