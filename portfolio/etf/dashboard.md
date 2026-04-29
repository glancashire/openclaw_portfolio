# Dashboard: etf

## Summary
- Total value: CHF 5000
- Cash: CHF 5000
- Invested: CHF 0
- Number of holdings: 0
- Strategy status: blocked
- Last sync: 2026-04-28 18:02:00
- Last rebalance check: 2026-04-29 10:10:43
- Broker readiness: Interactive Brokers gateway/session is not reachable; broker-backed pricing falls back to draft assumptions.

## Allocation vs Target
| Asset class | Current % | Target % | Drift % | Status |
|---|---:|---:|---:|---|
| Global equities | 0 | 60 | -60 | out_of_bounds |
| Swiss equities | 0 | 20 | -20 | out_of_bounds |
| Bonds / cash-like | 0 | 20 | -20 | out_of_bounds |

## Instrument Overview
| Ticker / ISIN | Name | Planned CHF | Planned % | Target % | Drift % | Action |
|---|---|---:|---:|---:|---:|---|
| IE00B5BMR087 | iShares Core S&P 500 UCITS ETF USD (Acc) | 1620 | 32.4 | 40 | -7.6 | buy 1620 CHF (3 @ 600) |
| LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 979.2 | 19.58 | 20 | -0.42 | buy 979.2 CHF (34 @ 30) |
| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | 960 | 19.2 | 20 | -0.8 | buy 960 CHF (8 @ 120) |
| CASH-CHF | CHF cash balance | 1000 | 20 | 20 | 0 | hold 1000 CHF (0 @ 0) |

## Recommended Actions
1. Restore Interactive Brokers read-only connectivity before relying on broker-backed pricing or conid resolution.
2. Keep proposals in dry-run mode and treat current order sizing as draft-only until broker connectivity is healthy.

## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 440.8 unallocated beyond the intentional CHF cash sleeve.
- Interactive Brokers gateway/session is not reachable; broker-backed pricing falls back to draft assumptions.
- Latest history note: weekly report cycle snapshot

## Execution Plan
- IE00B5BMR087: target 40% | intended CHF 1620 | executable CHF 1620 | gap CHF 0
- LU0950668870: target 20% | intended CHF 979.2 | executable CHF 979.2 | gap CHF 0
- CH0032912732: target 20% | intended CHF 960 | executable CHF 960 | gap CHF 0
- CASH-CHF: target 20% | intended CHF 1000 | executable CHF 1000 | gap CHF 0
- Totals: intended CHF 4559.2 | executable CHF 4559.2 | gap CHF 0

## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
| 2026-04-28 21:44:33 | hold | CHF cash balance | 1000 | planned |
| 2026-04-28 21:44:33 | buy | UBS SLI ETF (SMI gleichgewichtet) | 960 | proposed |
| 2026-04-28 21:44:33 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 979.2 | proposed |
| 2026-04-28 21:44:33 | buy | iShares Core S&P 500 UCITS ETF USD (Acc) | 1620 | proposed |
