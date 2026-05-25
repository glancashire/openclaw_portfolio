# Phase 45 — ETF Quality Filter + Market-Open Smart Execution

## Goal
1. Add an ETF quality filter requiring **physical replication only** (no synthetic/swap-based) and **minimal TER** unless explicitly overridden.
2. Cancel pre-market orders (done) and instead submit orders **after market open** with real-time price data to make better limit price decisions based on where the market is heading.

## Checklist

### 1. ETF quality filter
- [ ] Add `config/etf-quality-policy.json` defining:
  - `replicationMethod`: "physical" (reject synthetic/swap-based)
  - `maxTerPct`: threshold (e.g. 0.20%) — prefer lowest TER available
  - `allowExplicitOverride`: true (user can override per-instrument)
- [ ] Add `lib/etfQualityFilter.js` with:
  - `filterByReplication(candidates)` — reject synthetic ETFs
  - `rankByTer(candidates)` — sort by TER ascending
  - `validateInstrumentQuality(instrument, policy)` — check single instrument
- [ ] Integrate filter into trade proposal generation (before order placement)
- [ ] Re-evaluate current instrument selection (SLICHA, EMUAA, VUSA) against the filter
- [ ] If any instrument fails the filter, find a better alternative

### 2. Market-open smart execution
- [ ] Create `scripts/submit-orders-at-open.js` that:
  - Waits until market is open (checks trading hours)
  - Fetches real-time bid/ask/last for each instrument
  - Calculates smart limit price (e.g. midpoint or last + small buffer)
  - Places limit orders with tight limits based on live data
  - Monitors for fills and sends email notifications
- [ ] Set up a cron job to trigger at 09:01 CET (07:01 UTC) on the next trading day
- [ ] Remove the pre-market GTC order approach

### 3. Update portfolio instrument selection
- [ ] Research TER and replication method for:
  - SLICHA (UBS ETF SLI) — check if physical
  - EMUAA (UBS MSCI EMU) — check if physical
  - VUSA (Vanguard S&P 500) — check if physical
- [ ] If any are synthetic or have high TER, find physical alternatives with lower TER
- [ ] Update `portfolio/etf/portfolio.md` approved instruments if needed

### 4. Tests
- [ ] Test ETF quality filter with mock data (physical vs synthetic, TER ranking)
- [ ] Test smart execution script in dry-run mode
- [ ] Verify cron job is scheduled correctly

## Exit criteria
- ETF quality policy enforced: only physical replication, minimal TER
- Orders placed after market open with real-time pricing
- All instruments pass the quality filter
- Cron job scheduled for next trading day open
