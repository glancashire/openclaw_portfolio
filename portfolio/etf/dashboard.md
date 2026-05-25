# Dashboard: etf

## Immediate Status
- Portfolio status: attention_needed
- Top blocker: none currently surfaced
- Next action: CH0032912732: Broker rejected the order because the contract identity or venue resolution was not accepted.
- Broker health: Interactive Brokers read-only connectivity and live/realtime market data are available.
- Execution posture: ready_for_review
- Delivery posture: ready
- Active blockers: 0
- Pending operator queue items: 8

## Health Snapshot
- Strategy status: rebalance_needed
- Last successful sync: 2026-05-22 15:52:43
- Data freshness: current
- Pending approvals: 0
- In-flight execution rows: 0

## Pending Operator Actions
1. [execution_block/blocked/high] CH0032912732: Broker rejected the order because the contract identity or venue resolution was not accepted.
2. [execution_block/blocked/high] CH0130595124: Broker rejected the order because the contract identity or venue resolution was not accepted.
3. [execution_block/blocked/high] IE000XZSV718: Broker rejected the order because the contract identity or venue resolution was not accepted.
4. [execution_block/blocked/high] IE00B5BMR087: Broker rejected the order because the contract identity or venue resolution was not accepted.
5. [execution_block/blocked/high] IE00BD4TXW66: Broker rejected the order because the contract identity or venue resolution was not accepted.
6. [execution_block/blocked/high] LU0950668870: Broker rejected the order because the contract identity or venue resolution was not accepted.
7. [data/contract_identity_gap/medium] 4 approved instrument(s) are missing IBKR symbols. Example: IE00B44T3H88.
8. [data/contract_identity_gap/medium] 5 approved instrument(s) are missing IBKR conids. Example: LU0950670850.

## Portfolio Value Snapshot
- Total value CHF: 22209.4831212
- Cash CHF: 0
- Invested CHF: 22209.4831212
- Daily move CHF: 0
- Daily move %: 0
- Since last report CHF: 0
- Since last report %: 0
- Number of holdings: 3
- Latest snapshot date: 2026-05-23

## Allocation Health
| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
| Global equities | 83.26 | 60 | 23.26 | out_of_bounds | yes | outside min/max band |
| Swiss equities | 16.74 | 20 | -3.26 | on_track | no | within tolerance |
| Bonds / cash-like | 0 | 20 | -20 | out_of_bounds | yes | outside min/max band |

## Instrument Actions Queue
| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
| IE00B5BMR087 | 0 | 40 | watch | No active proposal | watch |
| LU0950668870 | 0 | 20 | watch | No active proposal | watch |
| CH0032912732 | 0 | 12 | watch | No active proposal | watch |
| CH0130595124 | 0 | 8 | watch | No active proposal | watch |
| LU0950670850 | 0 | 0 | watch | No active proposal | watch |
| IE00B44T3H88 | 0 | 0 | watch | No active proposal | watch |
| IE00B5L8K969 | 0 | 0 | watch | No active proposal | watch |
| IE00B4L5YX21 | 0 | 0 | watch | No active proposal | watch |
| CASH-CHF | 9.11 | 20 | planned: hold | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order. | blocked_by_min_trade_size |

## Safety / Risk Diagnostics
- Safety status: clear
- Risk-limit warnings: 0
- Broker/API warnings: 0
- Stale data warnings: 0
- Execution pause state: active
- Active blocker detail:
- none

## Contract Intelligence Readiness
- 4/9 approved instrument(s) have complete IBKR contract identity; missing conid: 5, missing symbol: 4, missing venue: 0.
- Recommended contract-intelligence action: Resolve missing IBKR conids before treating the full approved instrument list as execution-ready.

## Operator Queue Summary
- Total queue items: 8
- Blocking items: 0
- Approval items: 0
- Fresh actionable approvals: 0
- Stale approvals needing reapproval: 0
- Execution items: 0
- Open-runner first handoffs: 0
- Open-runner retries: 0
- Recovery items: 0
- Delivery items: 0
- Data items: 2
- Warning items: 0
- Workflow items: 6

## Recent Material Events
| Time | Event type | Severity | Summary | Next step |
|---|---|---|---|---|
| 2026-05-25 15:20:49.084 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Resolve the blocking condition before proceeding. |
| 2026-05-25 15:20:48.724 UTC | draft_execution_blocked | warn | Requested instrument is not in Approved Instruments. | Resolve the blocking condition before proceeding. |
| 2026-05-25 15:13:40.726 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Resolve the blocking condition before proceeding. |
| 2026-05-25 15:13:40.368 UTC | draft_execution_blocked | warn | Requested instrument is not in Approved Instruments. | Resolve the blocking condition before proceeding. |
| 2026-05-25 15:11:18.026 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Resolve the blocking condition before proceeding. |

## Report / Delivery Status
- Weekly report: latest history 2026-05-23
- Monthly report: email_and_repo
- Quarterly report: local_operator_review
- Delivery readiness: ready
- Failure alert readiness: local_operator_review
- Notified fills: 5
- Reconciled fills pending notification backfill: 0
- Acknowledged backfilled fills: 1

## Recommended Next Step
CH0032912732: Broker rejected the order because the contract identity or venue resolution was not accepted.

## Status Labels
- Pending approvals queue count: 0
- In-flight execution rows: 0
- Latest action recommendations:
  - Review and approve the current dry-run instrument proposals before broker connectivity is enabled.
  - Refresh history snapshots after holdings updates and trade execution.

## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 20185.35 unallocated beyond the intentional CHF cash sleeve.
- Latest history note: weekly report cycle snapshot
- Observability shows 99 recent blocked execution-policy event(s).

## Observability Status
- Runtime event file present: yes
- Recent runtime events scanned: 100
- Recent blocked trade events: 99
- Open-runner first handoff events: 1
- Open-runner retry events: 0
- Recent degraded broker events: 0
- Recent stale-data events: 0

## Execution Lifecycle
- Proposed: 0
- Approved: 0
- Rejected: 0
- Staged: 0
- Submitted: 0
- Partially filled: 0
- Filled: 0
- Cancelled: 0
- Failed: 0
- Planned-only entries: 1
- Rows with broker order id: 6

## Execution Plan
- CASH-CHF: target 20% | intended CHF 2024.13 | executable CHF 2024.13 | gap CHF 0
- Totals: intended CHF 2024.13 | executable CHF 2024.13 | gap CHF 0

## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
| 2026-05-22 12:59:21 | buy | UBS SPI Mid ETF (SPI ohne SMI) | 2427.44 | inactive |
| 2026-05-22 12:38:13 | buy | UBS SPI Mid ETF (SPI ohne SMI) | 2441.5 | inactive |
| 2026-05-22 11:00:07 | buy | CH0032912732 | 0 | inactive |
| 2026-05-22 11:00:07 | buy | LU0950668870 | 0 | inactive |
| 2026-05-22 11:00:07 | buy | IE00B5BMR087 | 0 | inactive |
