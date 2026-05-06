# Dashboard: etf

## Summary
- Total value: CHF 5000
- Cash: CHF 5000
- Invested: CHF 0
- Number of holdings: 0
- Strategy status: blocked
- Last sync: 2026-05-02 10:20:02
- Last rebalance check: 2026-05-06 11:14:29
- Broker readiness: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
- Broker automation paused: no

## Freshness
- Dashboard stale: no
- Dashboard file present: yes
- Newest source file: portfolio/etf/history.md

## Allocation vs Target
| Asset class | Current % | Target % | Drift % | Status |
|---|---:|---:|---:|---|
| Global equities | 0 | 60 | -60 | out_of_bounds |
| Swiss equities | 0 | 20 | -20 | out_of_bounds |
| Bonds / cash-like | 0 | 20 | -20 | out_of_bounds |

## Instrument Overview
| Ticker / ISIN | Name | Planned CHF | Planned % | Target % | Drift % | Action |
|---|---|---:|---:|---:|---:|---|
| IE00B5BMR087 | iShares Core S&P 500 UCITS ETF USD (Acc) | 1620 | 32.4 | 40 | -7.6 | proposal: buy 1620 CHF (3 @ 600) |
| LU0950668870 | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 970.82 | 19.42 | 20 | -0.58 | proposal: buy 970.82 CHF (26 @ 38.895) |
| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | 942.48 | 18.85 | 20 | -1.15 | proposal: buy 942.48 CHF (6 @ 157.08) |
| CASH-CHF | CHF cash balance | 1000 | 20 | 20 | 0 | planned: hold 1000 CHF (0 @ 0) |

## Recommended Actions
1. Restore Interactive Brokers read-only connectivity before relying on broker-backed pricing or conid resolution.
2. Keep proposals in dry-run mode and treat current order sizing as draft-only until broker connectivity is healthy.

## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 466.7 unallocated beyond the intentional CHF cash sleeve.
- Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
- Latest history note: weekly report cycle snapshot

## Execution Lifecycle
- Proposed: 7
- Approved: 0
- Rejected: 0
- Staged: 0
- Submitted: 0
- Partially filled: 0
- Filled: 0
- Cancelled: 0
- Failed: 0
- Planned-only entries: 1
- Rows with broker order id: 0

## Execution Plan
- LU0950668870: target 20% | intended CHF 970.82 | executable CHF 970.82 | gap CHF 0
- CH0032912732: target 20% | intended CHF 942.48 | executable CHF 942.48 | gap CHF 0
- IE00B5BMR087: target 40% | intended CHF 1620 | executable CHF 1620 | gap CHF 0
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
