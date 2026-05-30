# Dashboard: etf
## Portfolio Value Snapshot
- Total value CHF: 90390.18983012001
- Cash CHF: 4701.68
- Invested CHF: 85688.50983012
- Daily move CHF: 0
- Daily move %: 0
- Since last report CHF: 0
- Since last report %: 0
- Number of holdings: 9
- Latest snapshot date: 2026-05-29
- Total unrealized profit CHF: -1585.15
- Total unrealized profit %: -1.82
- Cost-basis coverage: 9/9 holdings (CHF 85688.51 of position value)

## Profit / Loss
- Total unrealized profit CHF: -1585.15
- Total cost basis CHF (covered holdings only): 87273.65
- Total unrealized profit %: -1.82%
- Cost-basis source priority: trades.md filled buys, then IBKR avg cost fallback. Holdings without cost-basis history show —.

| Instrument | Value CHF | Cost basis CHF | Profit CHF | Profit % | Cost basis source |
|---|---:|---:|---:|---:|---|
| SPMCHA | 8'339.20 | 8'262.29 | 76.91 | +0.93% | IBKR avg cost |
| UKGBPB | 6'067.28 | 6'069.24 | -1.96 | -0.03% | IBKR avg cost |
| HMCD | 4'411.69 | 4'393.11 | 18.58 | +0.42% | IBKR avg cost |
| CEBL | 6'948.56 | 7'430.50 | -481.94 | -6.49% | trades.md |
| SEC0 | 8'641.19 | 8'440.81 | 200.38 | +2.37% | IBKR avg cost |
| LCUJ | 5'201.59 | 5'195.05 | 6.54 | +0.13% | IBKR avg cost |
| CHSPI | 11'097.60 | 11'147.11 | -49.51 | -0.44% | trades.md |
| EMUAA | 12'222.17 | 12'586.60 | -364.43 | -2.90% | trades.md |
| SXR8 | 22'759.22 | 23'748.94 | -989.72 | -4.17% | trades.md |
## Holdings
Holdings sorted by CHF value (descending).

| Instrument | Value CHF | P/L CHF | P/L % | Weight % |
|---|---:|---:|---:|---:|
| SXR8 | 22'759.22 | -989.72 | -4.17% | 25.2% |
| EMUAA | 12'222.17 | -364.43 | -2.90% | 13.5% |
| CHSPI | 11'097.60 | -49.51 | -0.44% | 12.3% |
| SEC0 | 8'641.19 | +200.38 | +2.37% | 9.6% |
| SPMCHA | 8'339.20 | +76.91 | +0.93% | 9.2% |
| CEBL | 6'948.56 | -481.94 | -6.49% | 7.7% |
| UKGBPB | 6'067.28 | -1.96 | -0.03% | 6.7% |
| LCUJ | 5'201.59 | +6.54 | +0.13% | 5.8% |
| HMCD | 4'411.69 | +18.58 | +0.42% | 4.9% |
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
| Swiss equities | 21.5 | 20 | 1.5 | on_track | no | within tolerance |
| Bonds / cash-like | 5.2 | 15 | -9.8 | out_of_bounds | yes | outside min/max band |
## Pending Operator Actions
1. [recovery/degraded/high] Broker connectivity recovery: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
## Immediate Status
- Portfolio status: warning
- Top blocker: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
- Next action: Restore native connectivity first. Detail: connect ECONNREFUSED 127.0.0.1:4001
- Broker health: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
- Execution posture: degraded_dry_run_only
- Delivery posture: ready
- Active blockers: 0
- Pending operator queue items: 1
## Health Snapshot
- Strategy status: blocked
- Last successful sync: 2026-05-29 17:05:28
- Data freshness: current
- Pending approvals: 0
- In-flight execution rows: 0
## Safety / Risk Diagnostics
- Safety status: clear
- Risk-limit warnings: 0
- Broker/API warnings: 1
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
- Recovery items: 1
- Delivery items: 0
- Data items: 0
- Warning items: 0
- Workflow items: 0
## Recent Material Events
| Time | Event type | Severity | Summary | Next step |
|---|---|---|---|---|
| 2026-05-30 10:04:48.666 UTC | live_execution_blocked | warn | Portfolio requires confirmation before first live trade. | Broker readiness is not healthy: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001 | Resolve the blocking condition before proceeding. |
| 2026-05-30 10:04:48.663 UTC | draft_execution_blocked | warn | Requested instrument is not in Approved Instruments. | Resolve the blocking condition before proceeding. |
| 2026-05-30 10:03:01.803 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-05-30 10:02:48.017 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-05-30 10:02:42.705 UTC | safety_controls_blocked | warn | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
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
Broker connectivity recovery: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
## Status Labels
- Pending approvals queue count: 0
- In-flight execution rows: 0
- Latest action recommendations:
  - Restore Interactive Brokers read-only connectivity before relying on broker-backed pricing or conid resolution.
  - Keep proposals in dry-run mode and treat current order sizing as draft-only until broker connectivity is healthy.
## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Whole-share draft sizing leaves CHF 88366.06 unallocated beyond the intentional CHF cash sleeve.
- Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
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
