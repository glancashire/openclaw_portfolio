# Dashboard: etf

## Health Snapshot
- Portfolio status: attention_needed
- Strategy status: rebalance_needed
- Broker health: Interactive Brokers read-only connectivity and live/realtime market data are available.
- Last successful sync: 2026-05-11 21:27:45
- Data freshness: current
- Execution posture: ready_for_review
- Delivery posture: ready
- Pending approvals: 1
- Active blockers: 0

## Portfolio Value Snapshot
- Total value CHF: 5083.34
- Cash CHF: 4048.26
- Invested CHF: 1035.08
- Daily move CHF: 0
- Daily move %: 0
- Since last report CHF: 0
- Since last report %: 0
- Number of holdings: 2
- Latest snapshot date: 2026-05-11

## Allocation Health
| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
| Global equities | 100 | 60 | 40 | out_of_bounds | yes | outside min/max band |
| Swiss equities | 0 | 20 | -20 | out_of_bounds | yes | outside min/max band |
| Bonds / cash-like | 0 | 20 | -20 | out_of_bounds | yes | outside min/max band |

## Instrument Actions Queue
| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
| IE000XZSV718 | 0 | 40 | watch | No active proposal | watch |
| LU0950668870 | 0 | 20 | watch | No active proposal | watch |
| CH0032912732 | 18.54 | 20 | approved: buy | Deploy available cash toward underweight Swiss equities using UBS SLI ETF (SMI gleichgewichtet). | queued_for_open_runner |
| CASH-CHF | 19.67 | 20 | planned: hold | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order. | pending_user_approval |

## Safety / Risk Diagnostics
- Safety status: clear
- Risk-limit warnings: 0
- Broker/API warnings: 0
- Stale data warnings: 0
- Execution pause state: active
- Active blocker detail:
- none

## Pending Operator Actions
1. [approval/ready_for_review/medium] There are 1 approved trade row(s) ready for staging/review.
2. [delivery/backfill_review/medium] 1 reconciled fill(s) were detected after the live window and still need notification backfill review.

## Operator Queue Summary
- Total queue items: 2
- Blocking items: 0
- Approval items: 1
- Execution items: 0
- Open-runner first handoffs: 0
- Open-runner retries: 0
- Recovery items: 0
- Delivery items: 1
- Data items: 0
- Warning items: 0
- Workflow items: 0

## Recent Material Events
| Time | Event type | Severity | Summary | Next step |
|---|---|---|---|---|
| 2026-05-11 21:23:23.526 UTC | safety_controls_blocked | warn | Holdings contain unmatched instruments: review instrument mapping | Resolve the blocking condition before proceeding. |
| 2026-05-11 21:21:56.258 UTC | safety_controls_blocked | warn | Holdings contain unmatched instruments: review instrument mapping | Resolve the blocking condition before proceeding. |
| 2026-05-11 21:21:43.122 UTC | safety_controls_blocked | warn | Holdings contain unmatched instruments: review instrument mapping | Resolve the blocking condition before proceeding. |
| 2026-05-11 21:21:13.133 UTC | safety_controls_blocked | warn | Holdings contain unmatched instruments: review instrument mapping | Resolve the blocking condition before proceeding. |
| 2026-05-11 21:19:34.255 UTC | safety_controls_blocked | warn | Holdings contain unmatched instruments: review instrument mapping | Resolve the blocking condition before proceeding. |

## Report / Delivery Status
- Weekly report: latest history 2026-05-11
- Monthly report: local_only
- Quarterly report: local_operator_review
- Delivery readiness: ready
- Failure alert readiness: local_operator_review
- Notified fills: 0
- Reconciled fills pending notification backfill: 1

## Recommended Next Step
There are 1 approved trade row(s) ready for staging/review.

## Status Labels
- Pending approvals queue count: 1
- In-flight execution rows: 0
- Latest action recommendations:
  - Stage or review approved trades when broker readiness is healthy and confirmation gates are satisfied.
  - Keep unapproved proposals separate from broker-ready approved trades to avoid execution confusion.

## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 3140.86 unallocated beyond the intentional CHF cash sleeve.
- Latest history note: Broker order 9105 status sync: probable cancelled via completed-order evidence
- 1 reconciled fill(s) were detected without a confirmed sent notification; review notification backfill state.
- Observability shows 86 recent blocked execution-policy event(s).

## Observability Status
- Runtime event file present: yes
- Recent runtime events scanned: 92
- Recent blocked trade events: 86
- Open-runner first handoff events: 0
- Open-runner retry events: 6
- Recent degraded broker events: 0
- Recent stale-data events: 0

## Execution Lifecycle
- Proposed: 0
- Approved: 1
- Rejected: 0
- Staged: 0
- Submitted: 0
- Partially filled: 0
- Filled: 1
- Cancelled: 1
- Failed: 0
- Planned-only entries: 1
- Rows with broker order id: 2

## Execution Plan
- CH0032912732: target 20% | intended CHF 942.48 | executable CHF 942.48 | gap CHF 0
- CASH-CHF: target 20% | intended CHF 1000 | executable CHF 1000 | gap CHF 0
- Totals: intended CHF 1942.48 | executable CHF 1942.48 | gap CHF 0

## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
| 2026-05-02 10:25:27 | hold | CHF cash balance | 1000 | planned |
| 2026-05-11 06:33:50 | buy | UBS SLI ETF (SMI gleichgewichtet) | 942.48 | approved |
| 2026-05-11 06:33:50 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 970.82 | filled |
| 2026-05-11 06:33:50 | buy | State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc) | 1560.83 | cancelled |
| 2026-05-02 10:05:00 | buy | UBS SLI ETF (SMI gleichgewichtet) | 960 | rejected |
