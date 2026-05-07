# Multi-Portfolio Overview

## Summary
- Generated at: 2026-05-07T10:48:04.314Z
- Portfolios discovered: 2
- Active portfolios: 1
- Demo-like portfolios: 1
- Total value CHF: 5000
- Healthy portfolios: 0
- Warning / attention portfolios: 2
- Blocked portfolios: 0
- Pending approvals: 7
- Pending actions: 8

## Portfolio Board
| Portfolio | Kind | Total value CHF | Health | Drift posture | Blockers | Pending approvals | Pending actions | Recommended next step |
|---|---|---:|---|---|---:|---:|---:|---|
| acceptance-closure | demo_like | 0 | warning | 3 out_of_bounds | 5 | 0 | 6 | Resolve the active blocker: Portfolio still has open questions; trade execution must remain blocked. |
| etf | active | 5000 | warning | 3 out_of_bounds | 0 | 7 | 2 | Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. |

## Operator Queue Summary
- Total queue items: 8
- Blocking items: 7
- Approval items: 1
- Execution items: 0
- Recovery items: 2
- Delivery items: 0
- Data items: 0
- Warning items: 5
- Workflow items: 0

## Cross-Portfolio Recommended Actions
1. [blocker/high/blocked] acceptance-closure: Holdings and pricing are still simulated. — Resolve the blocking condition before proceeding.
2. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max cash drag after full deployment. — Resolve the blocking condition before proceeding.
3. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max single ETF allocation. — Resolve the blocking condition before proceeding.
4. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max single issuer allocation. — Resolve the blocking condition before proceeding.
5. [blocker/high/blocked] acceptance-closure: Portfolio still has open questions; trade execution must remain blocked. — Resolve the blocking condition before proceeding.
6. [recovery/high/degraded] acceptance-closure: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. — Restore broker connectivity before relying on broker-backed pricing or live execution paths.
7. [recovery/high/degraded] etf: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. — Restore broker connectivity before relying on broker-backed pricing or live execution paths.
8. [approval/medium/pending_user_approval] etf: 7 proposed trade row(s) still need user approval. — Review the proposed trades and approve or reject them explicitly.

## Notes
- This board is generated from Phase 29 structured summary artifacts rather than by re-deriving state directly from Markdown.
- Demo-like portfolios are surfaced explicitly so they do not silently disappear from operator review.
