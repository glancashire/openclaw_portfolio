# Multi-Portfolio Overview

## Summary
- Generated at: 2026-05-13T10:59:53.172Z
- Portfolios discovered: 2
- Active portfolios: 1
- Demo-like portfolios: 1
- Total value CHF: 5083.34
- Healthy portfolios: 0
- Warning / attention portfolios: 2
- Blocked portfolios: 0
- Pending approvals: 1
- Pending actions: 13

## Portfolio Board
| Portfolio | Kind | Total value CHF | Health | Drift posture | Blockers | Pending approvals | Pending actions | First handoffs | Retries | Recommended next step |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---|
| acceptance-closure | demo_like | 0 | warning | 3 out_of_bounds | 5 | 0 | 8 | 0 | 0 | Resolve the active blocker: Portfolio still has open questions; trade execution must remain blocked. |
| etf | active | 5083.34 | warning | 3 out_of_bounds | 0 | 1 | 5 | 0 | 1 | [quote_unavailable CH0032912732] Restore broker pricing and rerun the market-open submission path. |

## Operator Queue Summary
- Total queue items: 13
- Blocking items: 7
- Approval items: 1
- Execution items: 0
- Open-runner first handoffs: 0
- Open-runner retries: 1
- Recovery items: 2
- Delivery items: 2
- Data items: 0
- Warning items: 5
- Workflow items: 2

## Cross-Portfolio Recommended Actions
1. [blocker/high/blocked] acceptance-closure: Holdings and pricing are still simulated. — Resolve the blocking condition before proceeding.
2. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max cash drag after full deployment. — Resolve the blocking condition before proceeding.
3. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max single ETF allocation. — Resolve the blocking condition before proceeding.
4. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max single issuer allocation. — Resolve the blocking condition before proceeding.
5. [blocker/high/blocked] acceptance-closure: Portfolio still has open questions; trade execution must remain blocked. — Resolve the blocking condition before proceeding.
6. [recovery/high/degraded] acceptance-closure: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. — Restore broker connectivity before relying on broker-backed pricing or live execution paths.
7. [recovery/high/degraded] etf: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. — Restore broker connectivity before relying on broker-backed pricing or live execution paths.
8. [approval/medium/ready_for_review] etf: 1 approved trade row(s) are ready for staging or review. — Stage or review the approved trades when readiness gates are satisfied.
9. [open_runner/retry] etf: 1 trade row(s) were requeued for market-open retry after operator recovery. — Re-check the prior blocker cause before allowing the retry handoff to proceed.
10. [delivery/medium/pending] acceptance-closure: Dashboard/report freshness is stale relative to source state. — Review report delivery readiness and clear the pending action.

## Notes
- This board is generated from Phase 29 structured summary artifacts rather than by re-deriving state directly from Markdown.
- Demo-like portfolios are surfaced explicitly so they do not silently disappear from operator review.
