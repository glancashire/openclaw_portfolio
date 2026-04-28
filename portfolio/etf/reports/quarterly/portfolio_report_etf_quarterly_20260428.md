# Portfolio Report: etf

## Period
- Report type: quarterly
- Period start: 2026-04-01
- Period end: 2026-04-28
- Generated: 2026-04-28T21:58:28.313Z

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
| Global equities | 0 | 51.98 | 60 | -8.02 |
| Swiss equities | 0 | 19.2 | 20 | -0.8 |
| Bonds / cash-like | 0 | 20 | 20 | 0 |

## Trades During Period
| Date | Action | Instrument | Amount CHF | Reason |
|---|---|---|---:|---|
| 2026-04-28 21:44:33 | hold | CHF cash balance | 1000 | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order.; allocation before 0%; target 20%; allocation after 20%; drift before -20%; drift after 0%; drift corrected 20%; expected cost CHF 1000; funding source cash; Planning entry only; no broker order required for the cash sleeve. |
| 2026-04-28 21:44:33 | buy | UBS SLI ETF (SMI gleichgewichtet) | 960 | Deploy available cash toward underweight Swiss equities using UBS SLI ETF (SMI gleichgewichtet).; allocation before 0%; target 20%; allocation after 19.2%; drift before -20%; drift after -0.8%; drift corrected 19.2%; expected cost CHF 960; funding source cash; Dry-run instrument proposal only; Sized with draft price assumptions (120 CHF, FX 1 to CHF). |
| 2026-04-28 21:44:33 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 979.2 | Deploy available cash toward underweight Global equities using UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc.; allocation before 0%; target 20%; allocation after 19.58%; drift before -60%; drift after -0.42%; drift corrected 59.58%; expected cost CHF 979.2; funding source cash; Dry-run instrument proposal only; Sized with draft price assumptions (30 EUR, FX 0.96 to CHF). |
| 2026-04-28 21:44:33 | buy | iShares Core S&P 500 UCITS ETF USD (Acc) | 1620 | Deploy available cash toward underweight Global equities using iShares Core S&P 500 UCITS ETF USD (Acc).; allocation before 0%; target 40%; allocation after 32.4%; drift before -60%; drift after -7.6%; drift corrected 52.4%; expected cost CHF 1620; funding source cash; Dry-run instrument proposal only; Sized with draft price assumptions (600 USD, FX 0.9 to CHF). |

## Strategy Compliance
- On strategy: yes, draft state matches approved dry-run plan
- Rebalance needed: yes
- Risk limits breached: no

## Execution Plan
- IE00B5BMR087: action buy, quantity 3, limit 600, executable CHF 1620, target 40%
- LU0950668870: action buy, quantity 34, limit 30, executable CHF 979.2, target 20%
- CH0032912732: action buy, quantity 8, limit 120, executable CHF 960, target 20%
- CASH-CHF: action hold, quantity 0, limit 0, executable CHF 1000, target 20%
- Totals: executable CHF 4559.2, intended CHF 4559.2, gap CHF 0

## What Worked
- The dry-run portfolio state, trade log, and dashboard are all consistent enough to review as one workflow.

## What Did Not Work
- Live broker pricing and order quoting are not connected yet.

## Recommended Changes
- Connect live broker pricing to replace draft assumptions before enabling execution.

## Next Actions
- Approve or revise the current dry-run order set, then validate live read-only broker connectivity.
