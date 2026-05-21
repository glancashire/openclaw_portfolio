# Dashboard: etf

## Immediate Status
- Portfolio status: attention_needed
- Top blocker: none currently surfaced
- Next action: CH0032912732: No broker quote was available during market-open execution.
- Broker health: Interactive Brokers read-only connectivity and live/realtime market data are available.
- Execution posture: ready_for_review
- Delivery posture: ready
- Active blockers: 0
- Pending operator queue items: 5

## Health Snapshot
- Strategy status: minor_drift
- Last successful sync: 2026-05-21 14:56:52
- Data freshness: current
- Pending approvals: 1
- In-flight execution rows: 0

## Pending Operator Actions
1. [execution_block/blocked/high] CH0032912732: No broker quote was available during market-open execution.
2. [execution_block/blocked/high] IE00B5BMR087: Broker rejected or inactivated the order: Order rejected - reason:Not allowed to open a position: no trading permission. You may need to add the appropriate trading permission <br>through Client Portal.
3. [approval/pending_user_approval/medium] There are 1 proposed trade row(s) awaiting approval.
4. [data/contract_identity_gap/medium] 1 approved instrument(s) are missing IBKR conids. Example: CASH-CHF.
5. [data/contract_identity_gap/medium] 1 approved instrument(s) are missing IBKR symbols. Example: CASH-CHF.

## Portfolio Value Snapshot
- Total value CHF: 10553.75999865
- Cash CHF: 1365.27
- Invested CHF: 9188.48999865
- Daily move CHF: 0
- Daily move %: 0
- Since last report CHF: 0
- Since last report %: 0
- Number of holdings: 3
- Latest snapshot date: 2026-05-21

## Allocation Health
| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
| Global equities | 62.62 | 60 | 2.62 | on_track | no | within tolerance |
| Swiss equities | 24.44 | 20 | 4.44 | on_track | no | within tolerance |
| Bonds / cash-like | 12.94 | 20 | -7.06 | drifted | watch | drift threshold breached |

## Instrument Actions Queue
| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
| IE00B5BMR087 | 0 | 40 | watch | No active proposal | watch |
| LU0950668870 | 0 | 20 | watch | No active proposal | watch |
| CH0032912732 | 0 | 20 | watch | No active proposal | watch |
| CASH-CHF | 19.18 | 20 | planned: hold | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order. | blocked_by_min_trade_size |

## Safety / Risk Diagnostics
- Safety status: clear
- Risk-limit warnings: 0
- Broker/API warnings: 0
- Stale data warnings: 0
- Execution pause state: active
- Active blocker detail:
- none

## Contract Intelligence Readiness
- 3/4 approved instrument(s) have complete IBKR contract identity; missing conid: 1, missing symbol: 1, missing venue: 0.
- Recommended contract-intelligence action: Resolve missing IBKR conids before treating the full approved instrument list as execution-ready.

## Operator Queue Summary
- Total queue items: 5
- Blocking items: 0
- Approval items: 1
- Fresh actionable approvals: 0
- Stale approvals needing reapproval: 0
- Execution items: 0
- Open-runner first handoffs: 0
- Open-runner retries: 0
- Recovery items: 0
- Delivery items: 0
- Data items: 2
- Warning items: 0
- Workflow items: 2

## Recent Material Events
| Time | Event type | Severity | Summary | Next step |
|---|---|---|---|---|
| 2026-05-21 11:01:52.733 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Resolve the blocking condition before proceeding. |
| 2026-05-21 11:01:40.642 UTC | draft_execution_blocked | warn | Requested instrument is not in Approved Instruments. | Resolve the blocking condition before proceeding. |
| 2026-05-21 11:01:24.714 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Resolve the blocking condition before proceeding. |
| 2026-05-21 11:01:13.623 UTC | draft_execution_blocked | warn | Requested instrument is not in Approved Instruments. | Resolve the blocking condition before proceeding. |
| 2026-05-21 10:58:06.459 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Resolve the blocking condition before proceeding. |

## Report / Delivery Status
- Weekly report: latest history 2026-05-21
- Monthly report: email_and_repo
- Quarterly report: local_operator_review
- Delivery readiness: ready
- Failure alert readiness: local_operator_review
- Notified fills: 5
- Reconciled fills pending notification backfill: 0
- Acknowledged backfilled fills: 1

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
- Whole-share draft sizing leaves CHF 6735.84 unallocated beyond the intentional CHF cash sleeve.
- Latest history note: Broker order 9123 status sync: Filled
- Observability shows 92 recent blocked execution-policy event(s).

## Observability Status
- Runtime event file present: yes
- Recent runtime events scanned: 100
- Recent blocked trade events: 92
- Open-runner first handoff events: 2
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
- Filled: 3
- Cancelled: 0
- Failed: 0
- Planned-only entries: 1
- Rows with broker order id: 4

## Execution Plan
- IE000XZSV718: target 0% | intended CHF 1793.79 | executable CHF 1793.79 | gap CHF 0
- CASH-CHF: target 20% | intended CHF 2024.13 | executable CHF 2024.13 | gap CHF 0
- Totals: intended CHF 3817.92 | executable CHF 3817.92 | gap CHF 0

## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
| 2026-05-21 14:41:06 | buy | iShares Core S&P 500 UCITS ETF USD (Acc) | 1322.4 | filled |
| 2026-05-21 12:02:12 | buy | iShares Core S&P 500 UCITS ETF USD (Acc) | 1322.4 | inactive |
| 2026-05-21 09:27:46 | buy | UBS Core S&P 500 UCITS ETF USD acc | 984.28 | inactive |
| 2026-05-21 09:06:21 | buy | UBS Core S&P 500 UCITS ETF USD acc | 984.28 | inactive |
| 2026-05-21 08:41:09 | buy | UBS Core S&P 500 UCITS ETF USD acc | 984.28 | inactive |
