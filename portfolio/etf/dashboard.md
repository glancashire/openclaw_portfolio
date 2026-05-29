# Dashboard: etf
## Portfolio Value Snapshot
- Total value CHF: 90491.2276831
- Cash CHF: 4701.68
- Invested CHF: 85789.54768310001
- Daily move CHF: 0
- Daily move %: 0
- Since last report CHF: 0
- Since last report %: 0
- Number of holdings: 9
- Latest snapshot date: 2026-05-29
- Total unrealized profit CHF: -1479.93
- Total unrealized profit %: -1.7
- Cost-basis coverage: 9/9 holdings (CHF 85789.55 of position value)

## Profit / Loss
- Total unrealized profit CHF: -1479.93
- Total cost basis CHF (covered holdings only): 87269.48
- Total unrealized profit %: -1.7%
- Cost-basis source priority: trades.md filled buys, then IBKR avg cost fallback. Holdings without cost-basis history show —.

| Instrument | Value CHF | Cost basis CHF | Profit CHF | Profit % | Cost basis source |
|---|---:|---:|---:|---:|---|
| SPMCHA | 8'336.64 | 8'262.29 | 74.35 | +0.90% | IBKR avg cost |
| UKGBPB | 6'066.23 | 6'068.19 | -1.96 | -0.03% | IBKR avg cost |
| HMCD | 4'386.25 | 4'392.35 | -6.10 | -0.14% | IBKR avg cost |
| CEBL | 6'976.17 | 7'430.50 | -454.33 | -6.11% | trades.md |
| SEC0 | 8'698.06 | 8'439.35 | 258.71 | +3.07% | IBKR avg cost |
| LCUJ | 5'201.64 | 5'194.15 | 7.49 | +0.14% | IBKR avg cost |
| CHSPI | 11'124.80 | 11'147.11 | -22.31 | -0.20% | trades.md |
| EMUAA | 12'212.62 | 12'586.60 | -373.98 | -2.97% | trades.md |
| SXR8 | 22'787.14 | 23'748.94 | -961.80 | -4.05% | trades.md |
## Holdings
Holdings sorted by CHF value (descending).

| Instrument | Value CHF | P/L CHF | P/L % | Weight % |
|---|---:|---:|---:|---:|
| SXR8 | 22'787.14 | -961.80 | -4.05% | 25.2% |
| EMUAA | 12'212.62 | -373.98 | -2.97% | 13.5% |
| CHSPI | 11'124.80 | -22.31 | -0.20% | 12.3% |
| SEC0 | 8'698.06 | +258.71 | +3.07% | 9.6% |
| SPMCHA | 8'336.64 | +74.35 | +0.90% | 9.2% |
| CEBL | 6'976.17 | -454.33 | -6.11% | 7.7% |
| UKGBPB | 6'066.23 | -1.96 | -0.03% | 6.7% |
| LCUJ | 5'201.64 | +7.49 | +0.14% | 5.7% |
| HMCD | 4'386.25 | -6.10 | -0.14% | 4.8% |
## Instrument Actions Queue
Value-framed: actions are framed as deploy, grow, or hold — not fix drift.

| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
| IE00B5BMR087 | 0 | 25 | deploy | Target is 25% — no active buy planned. Cash available for deployment. | watch |
| LU0950668870 | 0 | 14 | deploy | Target is 14% — no active buy planned. Cash available for deployment. | watch |
| CH0032912732 | 0 | 9 | deploy | Target is 9% — no active buy planned. Cash available for deployment. | watch |
| CH0130595124 | 0 | 11 | deploy | Target is 11% — no active buy planned. Cash available for deployment. | watch |
| LU0950670850 | 0 | 7 | deploy | Target is 7% — no active buy planned. Cash available for deployment. | watch |
| IE00B44T3H88 | 0 | 5 | deploy | Target is 5% — no active buy planned. Cash available for deployment. | watch |
| IE00B5L8K969 | 0 | 8 | deploy | Target is 8% — no active buy planned. Cash available for deployment. | watch |
| LU1781541252 | 0 | 6 | deploy | Target is 6% — no active buy planned. Cash available for deployment. | watch |
| IE000I8KRLL9 | 0 | 10 | deploy | Target is 10% — no active buy planned. Cash available for deployment. | watch |
| CASH-CHF | 2.24 | 5 | planned: hold | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order. | blocked_by_min_trade_size |
## Balance Check
Allocation drift is tracked as a constraint; see below. All sleeves within target bands is the goal.

| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
| Global equities | 73.3 | 65 | 8.3 | out_of_bounds | yes | outside min/max band |
| Swiss equities | 21.51 | 20 | 1.51 | on_track | no | within tolerance |
| Bonds / cash-like | 5.2 | 15 | -9.8 | out_of_bounds | yes | outside min/max band |
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
- Last successful sync: 2026-05-29 14:21:42
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
| 2026-05-29 09:37:48.922 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-05-29 09:37:45.639 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-05-29 09:37:41.045 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-05-29 09:37:24.661 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-05-29 09:00:14.243 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
## Report / Delivery Status
- Weekly report: latest history 2026-05-29
- Monthly report: email_and_repo
- Quarterly report: local_operator_review
- Delivery readiness: ready
- Failure alert readiness: local_operator_review
- Notified fills: 11
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
- Whole-share draft sizing leaves CHF 88467.1 unallocated beyond the intentional CHF cash sleeve.
- Latest history note: Broker order 9151 status sync: Filled
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
- Filled: 2
- Cancelled: 0
- Failed: 0
- Planned-only entries: 1
- Rows with broker order id: 11
## Execution Plan
- CASH-CHF: target 5% | intended CHF 2024.13 | executable CHF 2024.13 | gap CHF 0
- Totals: intended CHF 2024.13 | executable CHF 2024.13 | gap CHF 0
## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
| 2026-05-29 12:15:33 | buy | UBS SLI ETF (SMI gleichgewichtet) | 4908 | filled |
| 2026-05-29 12:15:32 | buy | iShares MSCI EM Asia UCITS ETF (Acc) | 7700.95 | filled |
| 2026-05-29 10:13:12 | buy | UBS SLI ETF (SMI gleichgewichtet) | 4912.2 | inactive |
| 2026-05-29 10:13:10 | buy | iShares MSCI EM Asia UCITS ETF (Acc) | 7706.75 | inactive |
| 2026-05-29 10:07:44 | buy | HSBC MSCI China UCITS ETF USD | 5299.56 | inactive |
