# Phase 50 — Portfolio State Persistence + Rebalance Scheduler

## Goal
Persist portfolio state (holdings, NAV, drift history) to disk after each trade and on a schedule. Add a rebalance check that runs daily and alerts when drift exceeds threshold.

## Checklist

### 1. Portfolio state persistence (`lib/portfolioState.js`)
- [ ] Save current state: { holdings, cash, totalValue, lastUpdated, driftSnapshot }
- [ ] Load state from `runtime/portfolio-state.json`
- [ ] Update state after fills (called from monitor-fills)
- [ ] Track NAV history over time (append to `runtime/nav-history.jsonl`)

### 2. Daily rebalance check
- [ ] Create `scripts/check-rebalance.js`:
  - Loads portfolio state
  - Runs drift analysis
  - If drift > threshold, generates proposal and alerts operator
  - If balanced, logs and exits quietly
- [ ] Schedule as cron job (daily at 08:00 CET / 06:00 UTC, Mon-Fri)

### 3. NAV tracking
- [ ] Append { date, totalValue, cash, holdings } to nav-history.jsonl daily
- [ ] Simple NAV chart data for future dashboard use

### 4. Tests
- [ ] Test state save/load cycle
- [ ] Test NAV history append
- [ ] Test rebalance check with mock drift data
- [ ] Test state update after simulated fill

## Exit criteria
- Portfolio state persists across sessions
- Daily rebalance check runs and alerts when needed
- NAV history accumulates over time
- Tests pass
