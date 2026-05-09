# Dashboard: etf

## Health Snapshot
- Portfolio status: warning
- Strategy status: blocked
- Broker health: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
- Last successful sync: 2026-05-02 10:20:02
- Data freshness: current
- Execution posture: degraded_dry_run_only
- Delivery posture: ready
- Pending approvals: 7
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
- Latest snapshot date: 2026-05-06

## Allocation Health
| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
| Global equities | 0 | 60 | -60 | out_of_bounds | yes | outside min/max band |
| Swiss equities | 0 | 20 | -20 | out_of_bounds | yes | outside min/max band |
| Bonds / cash-like | 0 | 20 | -20 | out_of_bounds | yes | outside min/max band |

## Instrument Actions Queue
| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
| IE00B5BMR087 | 32.4 | 40 | proposed: buy | Deploy available cash toward underweight Global equities using iShares Core S&P 500 UCITS ETF USD (Acc). | pending_user_approval |
| LU0950668870 | 19.42 | 20 | proposed: buy | Deploy available cash toward underweight Global equities using UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc. | pending_user_approval |
| CH0032912732 | 18.85 | 20 | proposed: buy | Deploy available cash toward underweight Swiss equities using UBS SLI ETF (SMI gleichgewichtet). | pending_user_approval |
| CASH-CHF | 20 | 20 | planned: hold | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order. | pending_user_approval |

## Safety / Risk Diagnostics
- Safety status: clear
- Risk-limit warnings: 0
- Broker/API warnings: 1
- Stale data warnings: 0
- Execution pause state: active
- Active blocker detail:
- none

## Pending Operator Actions
1. [recovery/degraded/high] Broker connectivity recovery: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
2. [approval/pending_user_approval/medium] There are 7 proposed trade row(s) awaiting approval.

## Recent Material Events
| Time | Event type | Severity | Summary | Next step |
|---|---|---|---|---|
| 2026-05-06 13:50:22.805 UTC | live_execution_blocked | warn | Live execution requires explicit user approval flag. | Portfolio requires confirmation before first live trade. | Portfolio requires explicit user approval before the first live purchase. | Broker readiness is not healthy: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. | Resolve the blocking condition before proceeding. |
| 2026-05-06 13:50:22.803 UTC | draft_execution_blocked | warn | Requested instrument is not in Approved Instruments. | Resolve the blocking condition before proceeding. |
| 2026-05-06 13:49:27.492 UTC | live_execution_blocked | warn | Live execution requires explicit user approval flag. | Portfolio requires confirmation before first live trade. | Portfolio requires explicit user approval before the first live purchase. | Broker readiness is not healthy: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. | Resolve the blocking condition before proceeding. |
| 2026-05-06 13:49:27.490 UTC | draft_execution_blocked | warn | Requested instrument is not in Approved Instruments. | Resolve the blocking condition before proceeding. |

## Report / Delivery Status
- Weekly report: latest history 2026-05-06
- Monthly report: local_only
- Quarterly report: local_operator_review
- Delivery readiness: ready
- Failure alert readiness: local_operator_review

## Recommended Next Step
Broker connectivity recovery: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.

## Status Labels
- Pending approvals queue count: 7
- In-flight execution rows: 0
- Latest action recommendations:
  - Restore Interactive Brokers read-only connectivity before relying on broker-backed pricing or conid resolution.
  - Keep proposals in dry-run mode and treat current order sizing as draft-only until broker connectivity is healthy.

## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 466.7 unallocated beyond the intentional CHF cash sleeve.
- Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
- Latest history note: weekly report cycle snapshot
- Observability shows 4 recent blocked execution-policy event(s).

## Observability Status
- Runtime event file present: yes
- Recent runtime events scanned: 4
- Recent blocked trade events: 4
- Recent degraded broker events: 0
- Recent stale-data events: 0

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
