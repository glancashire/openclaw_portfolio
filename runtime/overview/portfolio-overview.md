# Multi-Portfolio Overview

## Summary
- Generated at: 2026-05-23T12:34:42.948Z
- Portfolios discovered: 2
- Active portfolios: 1
- Demo-like portfolios: 1
- Total value CHF: 22209.48
- Healthy portfolios: 0
- Warning / attention portfolios: 2
- Blocked portfolios: 0
- Pending approvals: 0
- Pending actions: 9

## Portfolio Board
| Portfolio | Kind | Total value CHF | Health | Drift posture | Blockers | Pending approvals | Pending actions | First handoffs | Retries | Recommended next step |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---|
| acceptance-closure | demo_like | 0 | warning | 3 out_of_bounds | 5 | 0 | 7 | 0 | 0 | Resolve the active blocker: Portfolio still has open questions; trade execution must remain blocked. |
| etf | active | 22209.4831212 | warning | 2 out_of_bounds | 0 | 0 | 1 | 0 | 0 | [contract_resolution_failed CH0032912732] Verify conid, symbol, exchange, and primary exchange before retrying. |

## Operator Queue Summary
- Total queue items: 9
- Blocking items: 7
- Approval items: 0
- Fresh actionable approvals: 0
- Stale approvals needing reapproval: 0
- Execution items: 0
- Open-runner first handoffs: 0
- Open-runner retries: 0
- Recovery items: 2
- Delivery items: 1
- Data items: 0
- Warning items: 5
- Workflow items: 1

## Cross-Portfolio Recommended Actions
1. [blocker/high/blocked] acceptance-closure: Holdings and pricing are still simulated. — Resolve the blocking condition before proceeding.
2. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max cash drag after full deployment. — Resolve the blocking condition before proceeding.
3. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max single ETF allocation. — Resolve the blocking condition before proceeding.
4. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max single issuer allocation. — Resolve the blocking condition before proceeding.
5. [blocker/high/blocked] acceptance-closure: Portfolio still has open questions; trade execution must remain blocked. — Resolve the blocking condition before proceeding.
6. [attention/high/blocked] etf: Circuit breaker tripped for CH0130595124: 3 consecutive cancellations (threshold 3). — Investigate why CH0130595124 keeps cancelling at the broker (subscription, liquidity, contract config). When fixed, run: node scripts/clear-circuit-breaker.js --portfolio=etf --instrument=CH0130595124
7. [recovery/high/degraded] acceptance-closure: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001 — Restore broker connectivity before relying on broker-backed pricing or live execution paths.
8. [recovery/high/degraded] etf: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001 — Restore broker connectivity before relying on broker-backed pricing or live execution paths.
9. [delivery/medium/pending] acceptance-closure: Dashboard/report freshness is stale relative to source state. — Review report delivery readiness and clear the pending action.

## Notes
- This board is generated from Phase 29 structured summary artifacts rather than by re-deriving state directly from Markdown.
- Demo-like portfolios are surfaced explicitly so they do not silently disappear from operator review.
