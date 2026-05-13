# Dashboard: etf

## Health Snapshot
- Portfolio status: attention_needed
- Strategy status: rebalance_needed
- Broker health: Interactive Brokers read-only connectivity and live/realtime market data are available.
- Last successful sync: 2026-05-13 14:29:30
- Data freshness: current
- Execution posture: ready_for_review
- Delivery posture: needs_operator_attention
- Pending approvals: 1
- Active blockers: 0

## Portfolio Value Snapshot
- Total value CHF: 5327.0300003
- Cash CHF: 116.64
- Invested CHF: 5210.3900003
- Daily move CHF: 0
- Daily move %: 0
- Since last report CHF: 0
- Since last report %: 0
- Number of holdings: 2
- Latest snapshot date: 2026-05-13

## Allocation Health
| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
| Global equities | 73.81 | 60 | 13.81 | out_of_bounds | yes | outside min/max band |
| Swiss equities | 24 | 20 | 4 | on_track | no | within tolerance |
| Bonds / cash-like | 2.19 | 20 | -17.81 | out_of_bounds | yes | outside min/max band |

## Instrument Actions Queue
| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
| LU0950668870 | 0 | 60 | watch | No active proposal | watch |
| CH0032912732 | 0 | 20 | watch | No active proposal | watch |
| CASH-CHF | 38 | 20 | planned: hold | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order. | blocked_by_min_trade_size |

## Safety / Risk Diagnostics
- Safety status: clear
- Risk-limit warnings: 0
- Broker/API warnings: 0
- Stale data warnings: 0
- Execution pause state: active
- Active blocker detail:
- none

## Pending Operator Actions
1. [execution_block/blocked/high] CH0032912732: No broker quote was available during market-open execution.
2. [approval/pending_user_approval/medium] There are 1 proposed trade row(s) awaiting approval.
3. [delivery/backfill_review/medium] 1 reconciled fill(s) were detected after the live window and still need notification backfill review.

## Operator Queue Summary
- Total queue items: 3
- Blocking items: 0
- Approval items: 1
- Execution items: 0
- Open-runner first handoffs: 0
- Open-runner retries: 0
- Recovery items: 0
- Delivery items: 1
- Data items: 0
- Warning items: 0
- Workflow items: 1

## Recent Material Events
| Time | Event type | Severity | Summary | Next step |
|---|---|---|---|---|
| 2026-05-12 22:42:22.204 UTC | submission_blocked | warn | UBSSLI blocked before submission: No broker quote was available during market-open execution. | Resolve the blocking condition before proceeding. |
| 2026-05-11 21:46:56.727 UTC | submission_blocked | warn | CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active. | Resolve the blocking condition before proceeding. |
| 2026-05-11 21:45:40.109 UTC | submission_blocked | warn | CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active. | Resolve the blocking condition before proceeding. |
| 2026-05-11 21:41:08.702 UTC | submission_blocked | warn | CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active. | Resolve the blocking condition before proceeding. |
| 2026-05-11 21:39:57.415 UTC | submission_blocked | warn | CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active. | Resolve the blocking condition before proceeding. |

## Report / Delivery Status
- Weekly report: latest history 2026-05-13
- Monthly report: local_only
- Quarterly report: local_operator_review
- Delivery readiness: needs_operator_attention
- Failure alert readiness: local_operator_review
- Notified fills: 0
- Reconciled fills pending notification backfill: 1

## Recommended Next Step
CH0032912732: No broker quote was available during market-open execution.

## Status Labels
- Pending approvals queue count: 1
- In-flight execution rows: 0
- Latest action recommendations:
  - Review and approve the current dry-run instrument proposals before broker connectivity is enabled.
  - Refresh history snapshots after holdings updates and trade execution.

## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 1509.11 unallocated beyond the intentional CHF cash sleeve.
- Latest history note: Broker order 9115 status sync: Filled
- 1 reconciled fill(s) were detected without a confirmed sent notification; review notification backfill state.
- Observability shows 91 recent blocked execution-policy event(s).

## Observability Status
- Runtime event file present: yes
- Recent runtime events scanned: 97
- Recent blocked trade events: 91
- Open-runner first handoff events: 0
- Open-runner retry events: 6
- Recent degraded broker events: 0
- Recent stale-data events: 0

## Execution Lifecycle
- Proposed: 1
- Approved: 0
- Rejected: 0
- Staged: 0
- Submitted: 0
- Partially filled: 0
- Filled: 2
- Cancelled: 0
- Failed: 0
- Planned-only entries: 1
- Rows with broker order id: 2

## Execution Plan
- IE000XZSV718: target 0% | intended CHF 1793.79 | executable CHF 1793.79 | gap CHF 0
- CASH-CHF: target 20% | intended CHF 2024.13 | executable CHF 2024.13 | gap CHF 0
- Totals: intended CHF 3817.92 | executable CHF 3817.92 | gap CHF 0

## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
| 2026-05-13 14:27:32 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 1899.6 | filled |
| 2026-05-13 13:57:43 | buy | UBS SLI ETF (SMI gleichgewichtet) | 1273.44 | filled |
| 2026-05-13 13:57:43 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 909.65 | filled |
| 2026-05-13 13:57:43 | buy | State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc) | 1793.79 | proposed |
| 2026-05-13 13:42:25 | buy | UBS SLI ETF (SMI gleichgewichtet) | 1270.72 | inactive |
