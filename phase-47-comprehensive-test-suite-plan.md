# Phase 47 — Comprehensive Test Suite for Trading Infrastructure

## Goal
Ensure all new trading infrastructure code (Phases 44-46) has thorough test coverage: lib modules, scripts, guards, email templates, and integration paths.

## Current coverage gaps
- `lib/marketHours.js` — tested in test-trading-guards.js (basic)
- `lib/etfQualityFilter.js` — tested in test-trading-guards.js (basic)
- `lib/tradeNotificationEmail.js` — no unit test (only integration via test-trade-notification-email.js)
- `lib/tradeExecutionNotifier.js` — no unit test
- `lib/mailgun.js` — only live integration test
- `scripts/execute-trades.js` — only market-closed guard tested
- `scripts/submit-orders-at-open.js` — only market-closed guard tested
- `scripts/monitor-fills.js` — no test

## Checklist

### 1. lib/marketHours.js — comprehensive tests
- [ ] All exchanges (EBS, IBIS2, LSEETF, SMART)
- [ ] Edge cases: exactly at open, exactly at close, 1 min before/after
- [ ] All days of week (Mon-Fri open, Sat-Sun closed)
- [ ] nextOpenTime from various starting points (Friday evening → Monday)
- [ ] Unknown exchange falls back to SMART

### 2. lib/etfQualityFilter.js — comprehensive tests
- [ ] validateInstrumentQuality: known physical ETF passes
- [ ] validateInstrumentQuality: unknown symbol fails
- [ ] validateInstrumentQuality: synthetic ETF fails (add mock)
- [ ] validateInstrumentQuality: high TER fails
- [ ] filterByReplication: filters correctly
- [ ] rankByTer: sorts ascending
- [ ] validateTradeList: mixed list (some pass, some fail)
- [ ] loadPolicy: reads config file correctly

### 3. lib/tradeNotificationEmail.js — unit tests
- [ ] buildTradeEmailHtml returns valid HTML
- [ ] Contains trade symbol, qty, price
- [ ] Contains portfolio holdings table
- [ ] Contains open orders section when present
- [ ] Shows "No open orders" when empty
- [ ] Handles missing/NaN values gracefully

### 4. lib/tradeExecutionNotifier.js — unit tests (mock mailgun)
- [ ] notifyTradeFill calls sendEmail with correct subject
- [ ] notifyTradeFill handles sendEmail failure gracefully (non-blocking)
- [ ] Subject line contains symbol and fill price

### 5. scripts/monitor-fills.js — unit tests
- [ ] State file created when missing
- [ ] Already-notified fills are skipped
- [ ] New fill triggers notification
- [ ] Cancelled orders don't trigger false notifications

### 6. Integration test runner
- [ ] Create `scripts/test-all-trading.js` that runs all trading tests
- [ ] Exit 0 only if all pass
- [ ] Report summary

## Exit criteria
- All tests pass
- Every lib/ module has dedicated test coverage
- Test runner reports 0 failures
