# Portfolio Report: etf

## Period
- Report type: weekly
- Period start: 2026-05-02
- Period end: 2026-05-02
- Generated: 2026-05-02T10:14:08.939Z

## Executive Summary
Latest snapshot: CHF 5000 total, CHF 5000 cash. Dry-run order planning is prepared but broker execution remains disabled.

## Performance
| Metric | Value |
|---|---:|
| Start value CHF | 5000 |
| End value CHF | 5000 |
| Change CHF | 0 |
| Change % | 0 |

## Allocation Review
| Asset class | Start % | End % | Target % | Drift % |
|---|---:|---:|---:|---:|
| Global equities | 0 | 51.82 | 60 | -8.18 |
| Swiss equities | 0 | 18.85 | 20 | -1.15 |
| Bonds / cash-like | 0 | 20 | 20 | 0 |

## Trades During Period
| Date | Action | Instrument | Amount CHF | Reason |
|---|---|---|---:|---|
| 2026-05-02 10:13:30 | hold | CHF cash balance | 1000 | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order.; allocation before 0%; target 20%; allocation after 20%; drift before -20%; drift after 0%; drift corrected 20%; expected cost CHF 1000; funding source cash; Planning entry only; no broker order required for the cash sleeve. |
| 2026-05-02 10:13:30 | buy | UBS SLI ETF (SMI gleichgewichtet) | 942.48 | Deploy available cash toward underweight Swiss equities using UBS SLI ETF (SMI gleichgewichtet).; allocation before 0%; target 20%; allocation after 18.85%; drift before -20%; drift after -1.15%; drift corrected 18.85%; expected cost CHF 942.48; funding source cash; Dry-run instrument proposal only; Sized with Interactive Brokers market data (ask 157.08 CHF, FX 1 to CHF). |
| 2026-05-02 10:13:30 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 970.82 | Deploy available cash toward underweight Global equities using UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc.; allocation before 0%; target 20%; allocation after 19.42%; drift before -60%; drift after -0.58%; drift corrected 59.42%; expected cost CHF 970.82; funding source cash; Dry-run instrument proposal only; Sized with Interactive Brokers market data (ask 38.895 EUR, FX 0.96 to CHF). |
| 2026-05-02 10:13:30 | buy | iShares Core S&P 500 UCITS ETF USD (Acc) | 1620 | Deploy available cash toward underweight Global equities using iShares Core S&P 500 UCITS ETF USD (Acc).; allocation before 0%; target 40%; allocation after 32.4%; drift before -60%; drift after -7.6%; drift corrected 52.4%; expected cost CHF 1620; funding source cash; Dry-run instrument proposal only; Sized with draft price assumptions (600 USD, FX 0.9 to CHF). |
| 2026-05-02 10:05:00 | hold | CHF cash balance | 1000 | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order.; allocation before 0%; target 20%; allocation after 20%; drift before -20%; drift after 0%; drift corrected 20%; expected cost CHF 1000; funding source cash; Planning entry only; no broker order required for the cash sleeve. |

## Strategy Compliance
- On strategy: yes, draft state matches approved dry-run plan
- Rebalance needed: yes
- Risk limits breached: no
- Broker readiness: Interactive Brokers read-only connectivity is available.

## Execution Plan
- IE00B5BMR087: action buy, quantity 3, limit 600, executable CHF 1620, target 40%
- LU0950668870: action buy, quantity 26, limit 38.895, executable CHF 970.82, target 20%
- CH0032912732: action buy, quantity 6, limit 157.08, executable CHF 942.48, target 20%
- CASH-CHF: action hold, quantity 0, limit 0, executable CHF 1000, target 20%
- Totals: executable CHF 4533.3, intended CHF 4533.3, gap CHF 0

## What Worked
- The dry-run portfolio state, trade log, and dashboard are all consistent enough to review as one workflow.

## What Did Not Work
- Live broker pricing and order quoting are not connected yet.

## Recommended Changes
- Connect live broker pricing to replace draft assumptions before enabling execution.

## Next Actions
- Approve or revise the current dry-run order set, then validate live read-only broker connectivity.
