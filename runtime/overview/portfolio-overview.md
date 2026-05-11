# Multi-Portfolio Overview

## Summary
- Generated at: 2026-05-11T09:14:45.507Z
- Portfolios discovered: 2
- Active portfolios: 1
- Demo-like portfolios: 1
- Total value CHF: 5000
- Healthy portfolios: 0
- Warning / attention portfolios: 2
- Blocked portfolios: 0
- Pending approvals: 3
- Pending actions: 10

## Portfolio Board
| Portfolio | Kind | Total value CHF | Health | Drift posture | Blockers | Pending approvals | Pending actions | First handoffs | Retries | Recommended next step |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---|
| acceptance-closure | demo_like | 0 | warning | 3 out_of_bounds | 5 | 0 | 6 | 0 | 0 | Resolve the active blocker: Portfolio still has open questions; trade execution must remain blocked. |
| etf | active | 5000 | warning | 3 out_of_bounds | 0 | 3 | 4 | 0 | 3 | 4 trade row(s) are marked failed and need operator review. |

## Operator Queue Summary
- Total queue items: 10
- Blocking items: 6
- Approval items: 1
- Execution items: 1
- Open-runner first handoffs: 0
- Open-runner retries: 1
- Recovery items: 0
- Delivery items: 2
- Data items: 0
- Warning items: 5
- Workflow items: 0

## Cross-Portfolio Recommended Actions
1. [blocker/high/blocked] acceptance-closure: Holdings and pricing are still simulated. — Resolve the blocking condition before proceeding.
2. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max cash drag after full deployment. — Resolve the blocking condition before proceeding.
3. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max single ETF allocation. — Resolve the blocking condition before proceeding.
4. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max single issuer allocation. — Resolve the blocking condition before proceeding.
5. [blocker/high/blocked] acceptance-closure: Portfolio still has open questions; trade execution must remain blocked. — Resolve the blocking condition before proceeding.
6. [execution/high/failed] etf: 4 trade row(s) are marked failed and need operator review. — Review the failed trade rows and resolve the root cause before retrying.
7. [approval/medium/ready_for_review] etf: 3 approved trade row(s) are ready for staging or review. — Stage or review the approved trades when readiness gates are satisfied.
8. [open_runner/retry] etf: 3 trade row(s) were requeued for market-open retry after operator recovery. — Re-check the prior blocker cause before allowing the retry handoff to proceed.
9. [delivery/medium/pending] acceptance-closure: Dashboard/report freshness is stale relative to source state. — Review report delivery readiness and clear the pending action.
10. [delivery/medium/pending] etf: 4 trade row(s) are marked failed and need operator review. — Review report delivery readiness and clear the pending action.

## Notes
- This board is generated from Phase 29 structured summary artifacts rather than by re-deriving state directly from Markdown.
- Demo-like portfolios are surfaced explicitly so they do not silently disappear from operator review.
