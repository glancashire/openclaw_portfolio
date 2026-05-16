# Multi-Portfolio Overview

## Summary
- Generated at: 2026-05-15T09:34:26.868Z
- Portfolios discovered: 2
- Active portfolios: 1
- Demo-like portfolios: 1
- Total value CHF: 5327.03
- Healthy portfolios: 0
- Warning / attention portfolios: 2
- Blocked portfolios: 0
- Pending approvals: 1
- Pending actions: 11

## Portfolio Board
| Portfolio | Kind | Total value CHF | Health | Drift posture | Blockers | Pending approvals | Pending actions | First handoffs | Retries | Recommended next step |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---|
| acceptance-closure | demo_like | 0 | warning | 3 out_of_bounds | 5 | 0 | 8 | 0 | 0 | Resolve the active blocker: Portfolio still has open questions; trade execution must remain blocked. |
| etf | active | 5327.0300003 | warning | 2 out_of_bounds | 0 | 1 | 3 | 0 | 0 | [quote_unavailable CH0032912732] Restore broker pricing and rerun the market-open submission path. |

## Operator Queue Summary
- Total queue items: 11
- Blocking items: 7
- Approval items: 1
- Fresh actionable approvals: 0
- Stale approvals needing reapproval: 0
- Execution items: 0
- Open-runner first handoffs: 0
- Open-runner retries: 0
- Recovery items: 2
- Delivery items: 1
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
8. [approval/medium/pending_user_approval] etf: 1 proposed trade row(s) still need user approval. — Review the proposed trades and approve or reject them explicitly.
9. [delivery/medium/pending] acceptance-closure: Dashboard/report freshness is stale relative to source state. — Review report delivery readiness and clear the pending action.
10. [backfill_review/medium/backfill_review] acceptance-closure: 1 reconciled fill(s) were detected after the live window and still need notification backfill review. — Review the reconciled fill notification backfill state and decide whether to record a manual backfill outcome.

## Notes
- This board is generated from Phase 29 structured summary artifacts rather than by re-deriving state directly from Markdown.
- Demo-like portfolios are surfaced explicitly so they do not silently disappear from operator review.
