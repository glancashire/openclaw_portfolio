# Dashboard: acceptance-closure
## Portfolio Value Snapshot
- Total value CHF: 0
- Cash CHF: 0
- Invested CHF: 0
- Daily move CHF: unknown
- Daily move %: unknown
- Since last report CHF: unknown
- Since last report %: unknown
- Number of holdings: 0
- Latest snapshot date: YYYY-MM-DD
- Total unrealized profit CHF: 0
- Total unrealized profit %: unknown (no cost-basis coverage yet)
- Cost-basis coverage: 0/0 holdings (CHF 0 of position value)
- Quote coverage: no quote provenance available
- Oldest quote age: unknown

## Profit / Loss
- Total unrealized profit CHF: 0
- Total cost basis CHF (covered holdings only): 0
- Total unrealized profit %: unknown
- Cost-basis source priority: trades.md filled buys, then IBKR avg cost fallback. Holdings without cost-basis history show —.

| Instrument | Value CHF | Cost basis CHF | Profit CHF | Profit % | Cost basis source | Quote source | Quote age |
|---|---:|---:|---:|---:|---|---|---|

## Holdings
Holdings sorted by CHF value (descending).
- Quote sources and ages are summarized above so the operator can see whether values came from IBKR Web API, IBKR TWS, or free fallback data.

| — | — | — | — | — |
## Instrument Actions Queue
Value-framed: actions are framed as deploy, grow, or hold — not fix drift.

| Instrument | Current % | Target % | Suggested action | Reason | Approval needed |
|---|---:|---:|---|---|---|
| <ticker / isin> | 0 | 50 | deploy | Target is 50% — no active buy planned. Cash available for deployment. | watch |
| <ticker / isin> | 0 | 20 | deploy | Target is 20% — no active buy planned. Cash available for deployment. | watch |
| <ticker / isin> | 0 | 30 | deploy | Target is 30% — no active buy planned. Cash available for deployment. | watch |
## Balance Check
Allocation drift is tracked as a constraint; see below. All sleeves within target bands is the goal.

| Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason |
|---|---:|---:|---:|---|---|---|
| Global equities | 0 | 50 | -50 | out_of_bounds | yes | outside min/max band |
| Swiss equities | 0 | 20 | -20 | out_of_bounds | yes | outside min/max band |
| Bonds / cash-like | 0 | 30 | -30 | out_of_bounds | yes | outside min/max band |
## Pending Operator Actions
1. [recovery/degraded/high] Broker connectivity recovery: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
2. [data/contract_identity_gap/medium] 3 approved instrument(s) are missing IBKR conids. Example: <ticker / isin>.
3. [data/contract_identity_gap/medium] 3 approved instrument(s) are missing IBKR symbols. Example: <ticker / isin>.
## Immediate Status
- Portfolio status: warning
- Top blocker: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
- Next action: Restore native IBKR gateway connectivity first, then rerun readiness. Detail: connect ECONNREFUSED 127.0.0.1:4001
- Broker health: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
- Execution posture: degraded_dry_run_only
- Delivery posture: ready
- Active blockers: 5
- Pending operator queue items: 3
## Health Snapshot
- Strategy status: blocked
- Last successful sync: YYYY-MM-DD HH:mm:ss
- Data freshness: current
- Pending approvals: 0
- In-flight execution rows: 0
## Safety / Risk Diagnostics
- Safety status: blocked_or_warning
- Risk-limit warnings: 0
- Broker/API warnings: 1
- Stale data warnings: 0
- Execution pause state: active
- Active blocker detail:
- error: Portfolio still has open questions; trade execution must remain blocked.
- error: Holdings and pricing are still simulated.
- error: Missing concrete risk limit: Max single ETF allocation.
- error: Missing concrete risk limit: Max single issuer allocation.
- error: Missing concrete risk limit: Max cash drag after full deployment.
## Contract Intelligence Readiness
- 0/3 approved instrument(s) have complete IBKR contract identity; missing conid: 3, missing symbol: 3, missing venue: 0.
- Recommended contract-intelligence action: Resolve missing IBKR conids before treating the full approved instrument list as execution-ready.
## Operator Queue Summary
- Total queue items: 3
- Blocking items: 0
- Approval items: 0
- Fresh actionable approvals: 0
- Stale approvals needing reapproval: 0
- Execution items: 0
- Open-runner first handoffs: 0
- Open-runner retries: 0
- Recovery items: 1
- Delivery items: 0
- Data items: 2
- Warning items: 0
- Workflow items: 0
## Recent Material Events
| Time | Event type | Severity | Summary | Next step |
|---|---|---|---|---|
| 2026-07-30 15:50:19.898 UTC | safety_controls_blocked | warn | Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-07-30 14:00:13.630 UTC | safety_controls_blocked | warn | Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-07-30 09:33:07.648 UTC | safety_controls_blocked | warn | Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-07-30 09:30:40.227 UTC | safety_controls_blocked | warn | Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
| 2026-07-30 08:00:12.544 UTC | safety_controls_blocked | warn | Portfolio still has open questions; trade execution must remain blocked. | Holdings and pricing are still simulated. | Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment. | Resolve the blocking condition before proceeding. |
## Report / Delivery Status
- Weekly report: latest history YYYY-MM-DD
- Monthly report: email_and_repo
- Quarterly report: local_operator_review
- Delivery readiness: ready
- Failure alert readiness: local_operator_review
- Notified fills: 12
- Reconciled fills pending notification backfill: 0
- Acknowledged backfilled fills: 1
## Recommended Next Step
Resolve the active blocker: Portfolio still has open questions; trade execution must remain blocked.
## Status Labels
- Pending approvals queue count: 0
- In-flight execution rows: 0
- Latest action recommendations:
  - Restore Interactive Brokers read-only connectivity before relying on broker-backed pricing or conid resolution.
  - Keep proposals in dry-run mode and treat current order sizing as draft-only until broker connectivity is healthy.
## Risk Warnings
- Dashboard regeneration currently computes allocation drift at the asset-class level only.
- Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
- Latest history note: 0
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
- Filled: 0
- Cancelled: 0
- Failed: 0
- Planned-only entries: 0
- Rows with broker order id: 0
## Execution Plan
- No draft execution plan yet.
## Recent Trades
| Date | Action | Instrument | Amount CHF | Status |
|---|---|---|---:|---|
| YYYY-MM-DD | <action> | <instrument> | 0 | none |
