# Phase 49 — Automated Trade Proposal Generator

## Goal
Build an automated trade proposal generator that analyzes portfolio drift against targets, respects the ETF quality filter and transaction cost minimums, and outputs a ready-to-approve proposal.

## Checklist

### 1. Portfolio drift analyzer (`lib/portfolioDrift.js`)
- [ ] Read current holdings from IB (positions + market values)
- [ ] Read target allocations from `portfolio/etf/portfolio.md`
- [ ] Calculate drift per instrument (actual% - target%)
- [ ] Identify instruments needing rebalancing (drift > threshold)
- [ ] Account for cash sleeve target (20%)

### 2. Trade proposal generator (`lib/tradeProposalGenerator.js`)
- [ ] Given drift analysis, generate buy/sell trades to reduce drift
- [ ] Respect minimum trade size (CHF 500)
- [ ] Respect cash reserve requirement (CHF 1,000 / 20%)
- [ ] Apply ETF quality filter to all proposed instruments
- [ ] Calculate quantities based on current prices
- [ ] Output structured proposal object

### 3. Proposal formatter (`lib/tradeProposalFormatter.js`)
- [ ] Format proposal as Markdown (for `runtime/trade-proposal-*.md`)
- [ ] Include: instrument details, quantities, limits, expected allocation
- [ ] Include: quality filter results, market hours info
- [ ] Include: approval instructions

### 4. Wire into CLI (`trade propose`)
- [ ] `trade propose` fetches live data and generates proposal
- [ ] `trade propose --dry-run` uses cached/mock data
- [ ] Writes proposal to `runtime/trade-proposal-YYYY-MM-DD.md`
- [ ] Shows summary on stdout

### 5. Tests
- [ ] Test drift calculation with mock positions
- [ ] Test trade generation respects minimums and cash reserve
- [ ] Test quality filter integration
- [ ] Test proposal formatting output

## Exit criteria
- `node scripts/trade.js propose` generates a valid trade proposal
- Proposal respects all constraints (quality, minimums, cash reserve)
- Tests pass
