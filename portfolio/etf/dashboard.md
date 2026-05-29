# Dashboard: etf

## Immediate Status
- Portfolio status: attention_needed
- Top blocker: none currently surfaced
- Next action: Portfolio is on track — consider deploying available cash into underweight positions.
- Broker health: Interactive Brokers read-only connectivity and live/realtime market data are available.
- Execution posture: ready_for_review
- Delivery posture: ready
- Active blockers: 0
- Pending operator queue items: 1

## Health Snapshot
- Strategy status: on_track
- Last successful sync: 2026-05-28 21:14:28
- Data freshness: current
- Pending approvals: 0
- In-flight execution rows: 0

## Portfolio Value Snapshot
- Total value CHF: 72274.24818472001
- Cash CHF: 9544.41
- Invested CHF: 62729.83818472001
- Daily move CHF: 0
- Daily move %: 0
- Since last report CHF: 0
- Since last report %: 0
- Number of holdings: 6
- Latest snapshot date: 2026-05-28
- Total unrealized profit CHF: 135.21
- Total unrealized profit %: 0.25
- Cost-basis coverage: 5/6 holdings (CHF 54467.55 of position value)

## Profit / Loss
- Total unrealized profit CHF: 135.21
- Total cost basis CHF (covered holdings only): 54332.33
- Total unrealized profit %: 0.25%
- Cost-basis source priority: trades.md filled buys, then IBKR avg cost fallback. Holdings without cost-basis history show —.

| Instrument | Value CHF | Cost basis CHF | Profit CHF | Profit % | Cost basis source |
|---|---:|---:|---:|---:|---|
| SPMCHA | 8'262.29 | — (no cost basis yet) | — | — | none |
| SEC0 | 8'967.07 | 8'961.87 | 5.20 | +0.06% | trades.md |
| LCUJ | 3'035.25 | 3'032.37 | 2.88 | +0.09% | trades.md |
| CHSPI | 6'165.43 | 6'156.32 | 9.11 | +0.15% | trades.md |
| EMUAA | 12'339.98 | 12'218.73 | 121.25 | +0.99% | trades.md |
| SXR8 | 23'959.81 | 23'963.04 | -3.23 | -0.01% | trades.md |

## Holdings
Holdings sorted by CHF value (descending).

| Instrument | Value CHF | P/L CHF | P/L % | Weight % |
|---|---:|---:|---:|---:|
| SXR8 | 23'959.81 | -3.23 | -0.01% | 33.2% |
| EMUAA | 12'339.98 | +121.25 | +0.99% | 17.1% |
| SEC0 | 8'967.07 | +5.20 | +0.06% | 12.4% |
| SPMCHA | 8'262.29 | — | — | 11.4% |
| CHSPI | 6'165.43 | +9.11 | +0.15% | 8.5% |
| LCUJ | 3'035.25 | +2.88 | +0.09% | 4.2% |

## Pending Operator Actions
1. [workflow/recommended/low] Portfolio is on track — consider deploying available cash into underweight positions.

## Balance Check

| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
| Global equities | 66.83 | 65 | 1.83 | on_track | no | within tolerance |
| Swiss equities | 19.96 | 20 | -0.04 | on_track | no | within tolerance |
| Bonds / cash-like | 13.21 | 15 | -1.79 | on_track | no | within tolerance |

## Instrument Actions Queue
| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
| IE00B5BMR087 | 0 | 30 | watch | No active proposal | watch |
| LU0950668870 | 0 | 17 | watch | No active proposal | watch |
| CH0032912732 | 0 | 9 | watch | No active proposal | watch |
| CH0130595124 | 0 | 11 | watch | No active proposal | watch |
| LU0950670850 | 0 | 0 | watch | No active proposal | watch |
| IE00B44T3H88 | 0 | 0 | watch | No active proposal | watch |
| IE00B5L8K969 | 0 | 0 | watch | No active proposal | watch |
| LU1781541252 | 0 | 6 | watch | No active proposal | watch |
| IE000I8KRLL9 | 0 | 12 | watch | No active proposal | watch |
| CASH-CHF | 2.8 | 15 | planned: hold | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order. | blocked_by_min_trade_size |

## Safety / Risk Diagnostics
- Safety status: clear
- Risk-limit warnings: 0
- Broker/API warnings: 0
- Stale data warnings: 0
- Execution pause state: active
- Active blocker detail:
- none

## Contract Intelligence Readiness
- 10/10 approved instrument(s) have complete IBKR contract identity; missing conid: 0, missing symbol: 0, missing venue: 0.
- Recommended contract-intelligence action: No contract-intelligence remediation is currently required.

## Operator Queue Summary
- Total queue items: 1
- Blocking items: 0
- Approval items: 0
- Fresh actionable approvals: 0
- Stale approvals needing reapproval: 0
- Execution items: 0
- Open-runner first handoffs: 0
- Open-runner retries: 0
- Recovery items: 0
- Delivery items: 0
- Data items: 0
- Warning items: 0
- Workflow items: 1

## Recent Material Events
| Time | Event type | Severity | Summary | Next step |
|---|---|---|---|---|
| 2026-05-29 08:00:04.902 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Resolve the blocking condition before proceeding. |
| 2026-05-29 08:00:04.547 UTC | draft_execution_blocked | warn | Requested instrument is not in Approved Instruments. | Resolve the blocking condition before proceeding. |
| 2026-05-29 07:58:01.292 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Resolve the blocking condition before proceeding. |
| 2026-05-29 07:58:00.936 UTC | draft_execution_blocked | warn | Requested instrument is not in Approved Instruments. | Resolve the blocking condition before proceeding. |
| 2026-05-29 07:56:46.203 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Resolve the blocking condition before proceeding. |

## Report / Delivery Status
- Weekly report: latest history 2026-05-28
- Monthly report: email_and_repo
- Quarterly report: local_operator_review
- Delivery readiness: ready
- Failure alert readiness: local_operator_review
- Notified fills: 5
- Reconciled fills pending notification backfill: 0
- Acknowledged backfilled fills: 1

## Recommended Next Step
Portfolio is on track — consider deploying available cash into underweight positions.

## Status Labels
- Pending approvals queue count: 0
- In-flight execution rows: 0
- Latest action recommendations:
  - Portfolio is on track — consider deploying available cash into underweight positions.
  - All positions are sized and performing as intended; hold and review after the next market session.

## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 70250.12 unallocated beyond the intentional CHF cash sleeve.
- Latest history note: evening sync snapshot
- Observability shows 100 recent blocked execution-policy event(s).

## Observability Status
- Runtime event file present: yes
- Recent runtime events scanned: 100
- Recent blocked trade events: 100
- Open-runner first handoff events: 0
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
- Filled: 4
- Cancelled: 0
- Failed: 0
- Planned-only entries: 1
- Rows with broker order id: 9

## Execution Plan
- CASH-CHF: target 15% | intended CHF 2024.13 | executable CHF 2024.13 | gap CHF 0
- Totals: intended CHF 2024.13 | executable CHF 2024.13 | gap CHF 0

## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
| 2026-05-28 14:02:14 | buy | IE000I8KRLL9 | 0 | filled |
| 2026-05-28 14:02:07 | buy | iShares MSCI Global Semiconductors UCITS ETF USD (Acc) | 9335.28 | submitted |
| 2026-05-28 13:17:17 | buy | LU1781541252 | 0 | filled |
| 2026-05-28 13:17:17 | buy | LU0950668870 | 0 | filled |
| 2026-05-28 13:17:17 | buy | IE00B5BMR087 | 0 | filled |
