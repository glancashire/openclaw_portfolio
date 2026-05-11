# Dashboard: etf

## Health Snapshot
- Portfolio status: warning
- Strategy status: rebalance_needed
- Broker health: Interactive Brokers read-only connectivity and live/realtime market data are available.
- Last successful sync: 2026-05-02 10:20:02
- Data freshness: current
- Execution posture: ready_for_review
- Delivery posture: needs_operator_attention
- Pending approvals: 3
- Active blockers: 0

## Portfolio Value Snapshot
- Total value CHF: 5000
- Cash CHF: 5000
- Invested CHF: 0
- Daily move CHF: 0
- Daily move %: 0
- Since last report CHF: 0
- Since last report %: 0
- Number of holdings: 0
- Latest snapshot date: 2026-05-11

## Allocation Health
| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
| Global equities | 0 | 60 | -60 | out_of_bounds | yes | outside min/max band |
| Swiss equities | 0 | 20 | -20 | out_of_bounds | yes | outside min/max band |
| Bonds / cash-like | 0 | 20 | -20 | out_of_bounds | yes | outside min/max band |

## Instrument Actions Queue
| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
| IE000XZSV718 | 31.22 | 40 | approved: buy | Deploy available cash toward underweight Global equities using State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc). | queued_for_open_runner |
| LU0950668870 | 19.42 | 20 | approved: buy | Deploy available cash toward underweight Global equities using UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc. | queued_for_open_runner |
| CH0032912732 | 18.85 | 20 | approved: buy | Deploy available cash toward underweight Swiss equities using UBS SLI ETF (SMI gleichgewichtet). | queued_for_open_runner |
| CASH-CHF | 20 | 20 | planned: hold | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order. | pending_user_approval |

## Safety / Risk Diagnostics
- Safety status: clear
- Risk-limit warnings: 0
- Broker/API warnings: 0
- Stale data warnings: 0
- Execution pause state: active
- Active blocker detail:
- none

## Pending Operator Actions
1. [approval/ready_for_review/medium] There are 3 approved trade row(s) ready for staging/review.
2. [delivery/pending/medium] 4 trade row(s) are marked failed and need operator review.

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
| 2026-05-11 08:26:05.857 UTC | submission_blocked | warn | CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active. | Resolve the blocking condition before proceeding. |
| 2026-05-11 08:26:04.705 UTC | submission_blocked | warn | CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active. | Resolve the blocking condition before proceeding. |
| 2026-05-11 08:26:04.637 UTC | queue_open_runner | info | Queued IE00B5BMR087 buy for market-open runner retry after operator recovery. | No immediate action required. |
| 2026-05-11 08:25:06.955 UTC | submission_blocked | warn | CSPX blocked before submission: Could not determine a smart limit price from broker quote data. | Resolve the blocking condition before proceeding. |
| 2026-05-11 08:24:51.728 UTC | submission_blocked | warn | CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active. | Resolve the blocking condition before proceeding. |

## Report / Delivery Status
- Weekly report: latest history 2026-05-11
- Monthly report: local_only
- Quarterly report: local_operator_review
- Delivery readiness: needs_operator_attention
- Failure alert readiness: local_operator_review

## Recommended Next Step
There are 3 approved trade row(s) ready for staging/review.

## Status Labels
- Pending approvals queue count: 3
- In-flight execution rows: 0
- Latest action recommendations:
  - Stage or review approved trades when broker readiness is healthy and confirmation gates are satisfied.
  - Keep unapproved proposals separate from broker-ready approved trades to avoid execution confusion.

## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 525.87 unallocated beyond the intentional CHF cash sleeve.
- 4 trade log row(s) are currently marked failed and may need manual review.
- Latest history note: Trade approved for broker execution.
- Observability shows 74 recent blocked execution-policy event(s).

## Observability Status
- Runtime event file present: yes
- Recent runtime events scanned: 80
- Recent blocked trade events: 74
- Open-runner first handoff events: 0
- Open-runner retry events: 6
- Recent degraded broker events: 0
- Recent stale-data events: 0

## Execution Lifecycle
- Proposed: 0
- Approved: 3
- Rejected: 0
- Staged: 0
- Submitted: 0
- Partially filled: 0
- Filled: 0
- Cancelled: 0
- Failed: 4
- Planned-only entries: 1
- Rows with broker order id: 0

## Execution Plan
- LU0950668870: target 20% | intended CHF 970.82 | executable CHF 970.82 | gap CHF 0
- CH0032912732: target 20% | intended CHF 942.48 | executable CHF 942.48 | gap CHF 0
- IE000XZSV718: target 40% | intended CHF 1560.83 | executable CHF 1560.83 | gap CHF 0
- CASH-CHF: target 20% | intended CHF 1000 | executable CHF 1000 | gap CHF 0
- Totals: intended CHF 4474.13 | executable CHF 4474.13 | gap CHF 0

## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
| 2026-05-02 10:25:27 | hold | CHF cash balance | 1000 | planned |
| 2026-05-11 06:33:50 | buy | UBS SLI ETF (SMI gleichgewichtet) | 942.48 | approved |
| 2026-05-11 06:33:50 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 970.82 | approved |
| 2026-05-11 06:33:50 | buy | State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc) | 1560.83 | approved |
| 2026-05-02 10:05:00 | buy | UBS SLI ETF (SMI gleichgewichtet) | 960 | rejected |
