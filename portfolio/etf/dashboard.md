# Dashboard: etf

## Summary
- Total value: CHF 5000
- Cash: CHF 5000
- Invested: CHF 0
- Number of holdings: 0
- Strategy status: rebalance_needed
- Last sync: 2026-05-02 10:20:02
- Last rebalance check: 2026-05-02 20:02:55
- Broker readiness: Interactive Brokers read-only connectivity is available.

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
| LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 970.82 | 19.42 | 20 | -0.58 | buy 970.82 CHF (26 @ 38.895) |
| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | 942.48 | 18.85 | 20 | -1.15 | buy 942.48 CHF (6 @ 157.08) |
| CASH-CHF | CHF cash balance | 1000 | 20 | 20 | 0 | hold 1000 CHF (0 @ 0) |

## Recommended Actions
1. Review and approve the current dry-run instrument proposals before broker connectivity is enabled.
2. Keep the defensive sleeve in CHF cash for now, and leave residual tradable cash of CHF 466.7 unallocated until live pricing is available.

## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 466.7 unallocated beyond the intentional CHF cash sleeve.
- Latest history note: Live IBKR read-only holdings sync and corrected live-priced dry-run proposal refresh

## Execution Plan
- IE00B5BMR087: target 40% | intended CHF 1620 | executable CHF 1620 | gap CHF 0
- LU0950668870: target 20% | intended CHF 970.82 | executable CHF 970.82 | gap CHF 0
- CH0032912732: target 20% | intended CHF 942.48 | executable CHF 942.48 | gap CHF 0
- CASH-CHF: target 20% | intended CHF 1000 | executable CHF 1000 | gap CHF 0
- Totals: intended CHF 4533.3 | executable CHF 4533.3 | gap CHF 0

## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
| 2026-05-02 10:25:27 | hold | CHF cash balance | 1000 | planned |
| 2026-05-02 10:25:27 | buy | UBS SLI ETF (SMI gleichgewichtet) | 942.48 | proposed |
| 2026-05-02 10:25:27 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 970.82 | proposed |
| 2026-05-02 10:25:27 | buy | iShares Core S&P 500 UCITS ETF USD (Acc) | 1620 | proposed |
| 2026-05-02 10:05:00 | buy | UBS SLI ETF (SMI gleichgewichtet) | 960 | proposed |
