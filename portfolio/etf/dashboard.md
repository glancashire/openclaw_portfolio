# Dashboard: etf
## Portfolio Value Snapshot
- Total value CHF: 92962.38376
- Cash CHF: 29544.41
- Invested CHF: 63417.97376
- Daily move CHF: 0
- Daily move %: 0
- Since last report CHF: 0
- Since last report %: 0
- Number of holdings: 6
- Latest snapshot date: 2026-05-28
- Total unrealized profit CHF: 765.64
- Total unrealized profit %: 1.41
- Cost-basis coverage: 5/6 holdings (CHF 55097.97 of position value)

## Profit / Loss
- Total unrealized profit CHF: 765.64
- Total cost basis CHF (covered holdings only): 54332.33
- Total unrealized profit %: 1.41%
- Cost-basis source priority: trades.md filled buys, then IBKR avg cost fallback. Holdings without cost-basis history show —.

| Instrument | Value CHF | Cost basis CHF | Profit CHF | Profit % | Cost basis source |
|---|---:|---:|---:|---:|---|
| SPMCHA | 8'320.00 | — (no cost basis yet) | — | — | none |
| SEC0 | 9'180.94 | 8'961.87 | 219.07 | +2.44% | trades.md |
| LCUJ | 3'074.37 | 3'032.37 | 42.00 | +1.39% | trades.md |
| CHSPI | 6'200.08 | 6'156.32 | 43.76 | +0.71% | trades.md |
| EMUAA | 12'449.89 | 12'218.73 | 231.16 | +1.89% | trades.md |
| SXR8 | 24'192.69 | 23'963.04 | 229.65 | +0.96% | trades.md |
## Holdings
Holdings sorted by CHF value (descending).

| Instrument | Value CHF | P/L CHF | P/L % | Weight % |
|---|---:|---:|---:|---:|
| SXR8 | 24'192.69 | +229.65 | +0.96% | 26.0% |
| EMUAA | 12'449.89 | +231.16 | +1.89% | 13.4% |
| SEC0 | 9'180.94 | +219.07 | +2.44% | 9.9% |
| SPMCHA | 8'320.00 | — | — | 8.9% |
| CHSPI | 6'200.08 | +43.76 | +0.71% | 6.7% |
| LCUJ | 3'074.37 | +42.00 | +1.39% | 3.3% |
## Instrument Actions Queue
Value-framed: actions are framed as deploy, grow, or hold — not fix drift.

| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
| IE00B5BMR087 | 0 | 30 | deploy | Target is 30% — no active buy planned. Cash available for deployment. | watch |
| LU0950668870 | 0 | 17 | deploy | Target is 17% — no active buy planned. Cash available for deployment. | watch |
| CH0032912732 | 0 | 9 | deploy | Target is 9% — no active buy planned. Cash available for deployment. | watch |
| CH0130595124 | 0 | 11 | deploy | Target is 11% — no active buy planned. Cash available for deployment. | watch |
| LU0950670850 | 0 | 0 | watch | No active proposal | watch |
| IE00B44T3H88 | 0 | 0 | watch | No active proposal | watch |
| IE00B5L8K969 | 0 | 0 | watch | No active proposal | watch |
| LU1781541252 | 0 | 6 | deploy | Target is 6% — no active buy planned. Cash available for deployment. | watch |
| IE000I8KRLL9 | 0 | 12 | deploy | Target is 12% — no active buy planned. Cash available for deployment. | watch |
| CASH-CHF | 2.18 | 15 | planned: hold | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order. | blocked_by_min_trade_size |
## Balance Check
Allocation drift is tracked as a constraint; see below. All sleeves within target bands is the goal.

| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
| Global equities | 52.6 | 65 | -12.4 | out_of_bounds | yes | outside min/max band |
| Swiss equities | 15.62 | 20 | -4.38 | on_track | no | within tolerance |
| Bonds / cash-like | 31.78 | 15 | 16.78 | out_of_bounds | yes | outside min/max band |
## Pending Operator Actions
1. [workflow/recommended/low] Portfolio is performing as intended. Hold current positions and review after the next market session.
## Immediate Status
- Portfolio status: attention_needed
- Top blocker: none currently surfaced
- Next action: Portfolio is performing as intended. Hold current positions and review after the next market session.
- Broker health: Interactive Brokers read-only connectivity and live/realtime market data are available.
- Execution posture: ready_for_review
- Delivery posture: ready
- Active blockers: 0
- Pending operator queue items: 1
## Health Snapshot
- Strategy status: rebalance_needed
- Last successful sync: 2026-05-29 08:06:23
- Data freshness: current
- Pending approvals: 0
- In-flight execution rows: 0
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
| 2026-05-29 08:40:53.265 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Resolve the blocking condition before proceeding. |
| 2026-05-29 08:40:52.886 UTC | draft_execution_blocked | warn | Requested instrument is not in Approved Instruments. | Resolve the blocking condition before proceeding. |
| 2026-05-29 08:32:47.158 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-05-29 08:32:43.861 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-05-29 08:32:41.245 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
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
Portfolio is performing as intended. Hold current positions and review after the next market session.
## Status Labels
- Pending approvals queue count: 0
- In-flight execution rows: 0
- Latest action recommendations:
  - Portfolio is performing as intended. Hold current positions and review after the next market session.
  - Continue normal monitoring and refresh the portfolio workflow after the next material state change.
## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 90938.25 unallocated beyond the intentional CHF cash sleeve.
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
