# Multi-Portfolio Overview

## Summary
- Generated at: 2026-06-04T07:23:43.488Z
- Portfolios discovered: 2
- Active portfolios: 1
- Demo-like portfolios: 1
- Total value CHF: 141621.37
- Healthy portfolios: 0
- Warning / attention portfolios: 2
- Blocked portfolios: 0
- Pending approvals: 0
- Pending actions: 8

## Open Phases
### Phase F  Fill-pipeline observability + retry
- Status: STARTED
- Progress: 90%

### Phase G  Deposits ledger close-out
- Status: STARTED
- Progress: 50%
- Completed: G1 — `import-ibkr-deposits.js` dedup + footer rebuild + `--dry-run` (Phase A2); G4 — Deposits-ledger lifecycle documented in `docs/operator-runbooks.md` (`3f86412`)
- Still open: G2 — Wire `import-ibkr-deposits.js` into the daily-sync cron once XLS path is stable (depends G3); G3 — Backfill `pending_ibkr_xls` reference for 2026-06-03 row when XLS arrives (operator-driven)

### Phase H  Allocation-target decision
- Status: STARTED
- Progress: 30%
- Completed: H1 — Baseline captured: `docs/research/h1-baseline-2026-06-03.json` + summary (`ac749da`)
- Still open: H2 — Decide path A (additive targets, keep SXR8 + EMUAA) vs path B (replace legacy slots) (needs H1 data, review date 2026-06-17); H3 — Apply the decision: update `portfolio.md` Approved Instruments + write the rebalance plan (depends H2)

### Phase B  IBKR ops residuals
- Status: WAITING
- Progress: 80%
- Completed: B1 — Quote posture green (live execution today); B2 — Read/report path stable; B3 — Recovery runbook published in `docs/operations/ibkr-recovery.md`
- Still open: B5 — Operator: keep IBKR session warm; respond to keepalive 2FA alerts (recurring ops, no engineering)

### Phase D  Parked product/domain explorations
- Status: PARKED
- Progress: 10%
- Still open: D1 — FX cash reconciliation (parked — reactivate only if live ops becomes confused); D2 — Control UI direct embedding (parked — editable source not yet available); D3 — EM ex-China sleeve (parked — no physical Acc UCITS resolves on IBKR feed)

## Portfolio Board
| Portfolio | Kind | Total value CHF | Health | Drift posture | Blockers | Pending approvals | Pending actions | First handoffs | Retries | Recommended next step |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---|
| acceptance-closure | demo_like | 0 | warning | 3 out_of_bounds | 5 | 0 | 6 | 0 | 0 | Resolve the active blocker: Portfolio still has open questions; trade execution must remain blocked. |
| etf | active | 141621.37489255 | attention_needed | 2 out_of_bounds | 0 | 0 | 2 | 0 | 0 | [contract_resolution_failed CH0032912732] Verify conid, symbol, exchange, and primary exchange before retrying. |

## Operator Queue Summary
- Total queue items: 8
- Blocking items: 5
- Approval items: 0
- Fresh actionable approvals: 0
- Stale approvals needing reapproval: 0
- Execution items: 1
- Open-runner first handoffs: 0
- Open-runner retries: 0
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
6. [execution/medium/in_flight] etf: 5 in-flight execution row(s) need reconciliation before overlapping actions. — Reconcile broker order status before creating overlapping execution plans.
7. [delivery/medium/pending] acceptance-closure: Dashboard/report freshness is stale relative to source state. — Review report delivery readiness and clear the pending action.
8. [delivery/medium/pending] etf: 5 in-flight execution row(s) need reconciliation before overlapping actions. — Review report delivery readiness and clear the pending action.

## Notes
- This board is generated from Phase 29 structured summary artifacts rather than by re-deriving state directly from Markdown.
- Demo-like portfolios are surfaced explicitly so they do not silently disappear from operator review.
- Open phases are read from the maintained CURRENT_PLAN.md control file (legacy OPEN_PHASES_OVERVIEW.md still supported as a fallback).
