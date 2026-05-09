# Phase 43 — First live transaction plan

## Goal
Execute the first real portfolio deployment: research current prices, propose efficient trades that respect transaction costs and minimum trade sizes, get operator approval, execute via Interactive Brokers, and update all portfolio state.

## Current state
- **Cash:** CHF 5,000 (100% cash, 0 holdings)
- **Target allocation:**
  - IE00B5BMR087 (iShares Core S&P 500 / CSPX): 40% → ~CHF 2,000
  - LU0950668870 (UBS MSCI EMU / EMUAA): 20% → ~CHF 1,000
  - CH0032912732 (UBS SLI ETF / UBSSLI): 20% → ~CHF 1,000
  - CASH-CHF: 20% → ~CHF 1,000
- **Broker:** Interactive Brokers, native mode configured, TWS/Gateway NOT currently running
- **Execution mode:** require_confirmation

## Pre-requisites
- [ ] IB TWS or Gateway must be running with API enabled on port 4001
- [ ] Verify connectivity with `ibkr_cli.py account-summary`
- [ ] Fetch live prices for all 3 ETFs via `ibkr_cli.py quote`

## Checklist

### 1. Research & price discovery
- [ ] Get live quotes for CSPX (IE00B5BMR087), EMUAA (LU0950668870), UBSSLI (CH0032912732)
- [ ] Research current bid/ask spreads and typical transaction costs on each venue
- [ ] Note FX rates (USD/CHF, EUR/CHF) for cross-currency trades
- [ ] Calculate optimal quantities that maximize allocation accuracy while minimizing number of trades and staying above CHF 500 minimum trade size

### 2. Trade proposal
- [ ] Build a concrete trade proposal showing:
  - Instrument, quantity, estimated price, estimated CHF cost, FX impact
  - Expected post-trade allocation vs target
  - Why each trade makes sense
  - Transaction cost estimate
- [ ] Present proposal to Graham for approval (or selection if alternatives exist)

### 3. Execution
- [ ] On approval, place limit orders via `ibkr_cli.py place-order` (limit slightly above ask for immediate fills)
- [ ] Monitor order fills
- [ ] Record broker order IDs

### 4. State update
- [ ] Update `trades.md` with actual execution details
- [ ] Sync holdings from broker: `scripts/sync-interactive-brokers-holdings.js`
- [ ] Regenerate dashboard: `scripts/regenerate-dashboard.js portfolio/etf`
- [ ] Write history snapshot: `scripts/write-history-snapshot.js portfolio/etf`
- [ ] Regenerate summary artifacts: `scripts/generate-portfolio-summary.js portfolio/etf`
- [ ] Regenerate overview artifacts: `scripts/generate-multi-portfolio-overview.js`
- [ ] Run report cycle if appropriate
- [ ] Fix any errors encountered during updates

### 5. Documentation
- [ ] Write financial/investing/trading learnings to `learnings/financial-trading-learnings.md`
- [ ] Write technical learnings to `learnings/technical-learnings.md`
- [ ] Write improvement suggestions to `learnings/improvement-plan.md`

## Transaction cost considerations
- IB tiered pricing for European ETFs: typically 0.05% of trade value, min ~EUR 1.25 / CHF 1.50
- FX conversion costs: ~0.002% (2 basis points) for IB FX
- **No mini trades:** minimum CHF 500 per trade (portfolio rebalancing policy)
- All 3 trades are well above minimum at ~CHF 1,000-2,000 each
- Use limit orders to control execution price
- Trade CHF-denominated ETF (UBSSLI on SIX) first to avoid FX complexity on smallest position

## Execution order preference
1. CH0032912732 (UBSSLI) on SIX in CHF — no FX needed, simplest
2. LU0950668870 (EMUAA) on Xetra in EUR — small FX impact
3. IE00B5BMR087 (CSPX) on LSE in USD — largest position, FX impact

## Safety constraints
- Execution mode is `require_confirmation` — every trade needs explicit operator approval
- Limit orders only (no market orders)
- Dry-run preview before any live submission
- Total deployment ≤ 80% of portfolio (CHF 4,000), keeping CHF 1,000 cash

## Exit criteria
Phase 43 is complete when:
- At least one real trade has been executed and confirmed
- All portfolio state files are updated with actual execution data
- Dashboard and summary artifacts reflect the new holdings
- Learnings and improvement plan files are written
