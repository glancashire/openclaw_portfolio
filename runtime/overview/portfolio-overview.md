# Multi-Portfolio Overview

## Summary
- Generated at: 2026-07-28T20:30:26.597Z
- Portfolios discovered: 2
- Active portfolios: 1
- Demo-like portfolios: 1
- Total value CHF: 152977.99
- Healthy portfolios: 0
- Warning / attention portfolios: 2
- Blocked portfolios: 0
- Pending approvals: 0
- Pending actions: 8

## Open Phases
### Phase L   Risk hardening (live-money safeguards)
- Status: STARTED
- Progress: 50%
- Completed: SELL price floor (refuse limit > 5% below bid); BUY price ceiling (refuse limit > 5% above ask); Per-leg notional cap (CHF 25k) + per-basket cap (CHF 50k)
- Still open: **L2.A** Sign portfolio.md + memory/*.md so agent can detect tampering; **L2.B** Daily loss circuit breaker (freeze transmit if intra-day NLV drops X%); **L2.C** Multi-party approval for baskets > CHF 25k

### Phase B5  IBKR keepalive 2FA
- Status: WAITING
- Progress: 90%
- Still open: Respond to alerts when they fire (no engineering work); No code changes required

### Phase F4  IBKR XLS backfill
- Status: WAITING
- Progress: 90%
- Still open: Drop a transactions XLS in `runtime/ibkr-statements/inbox/`; Confirm 2026-06-03 + 2026-06-05 deposits reconciled; Backfill reference numbers into `deposits.md`

### Phase G3  Deposits XLS reference backfill
- Status: WAITING
- Progress: 90%
- Still open: Wait for the XLS drop; Re-run `node scripts/process-ibkr-statement-inbox.js --portfolio=etf`; Verify reference numbers populated in `deposits.md`

### Phase H   Allocation rebalance decision (H2 + H3)
- Status: WAITING
- Progress: 90%
- Completed: **H1** Baseline frozen at `docs/research/h1-allocation-baseline-2026-06-03.json`
- Still open: **H2** Pick path A (no change) / B (light deconcentration) / C (full rotation) for SXR8 + EMUAA; **H3** Apply H2 decision to `portfolio.md`

### Phase D1  FX cash reconciliation
- Status: PARKED
- Progress: 10%
- Still open: Reactivate only if live ops are confused by FX cash differences

### Phase D2  Control UI direct embedding
- Status: PARKED
- Progress: 10%
- Still open: Reactivate when OpenClaw upstream Control UI gets the embedding hook

### Phase D3  EM ex-China sleeve
- Status: PARKED
- Progress: 10%
- Still open: Reactivate if a physical Acc UCITS for EM ex-China appears on IBKR feed

### Phase M   Small-cap sleeve + tick-size hardening
- Status: SHIPPED
- Completed: R2SC (SPDR Russell 2000 US Small Cap UCITS ETF, IE00BJ38QD84) added to approved instruments — Ubiquiti-adjacent low-cost sleeve; Remaining cash deployed: order 9173 filled 32 @ GBP 65.1357 (~CHF 2,283); cash CHF 2,433 → ~209; Root-caused the GBP/LSEETF "Inactive" rejection: flat `minTick=0.0005` is misleading; binding tick from market rule 983 is **0.01 above GBP 25**

## Portfolio Board
| Portfolio | Kind | Total value CHF | Health | Drift posture | Blockers | Pending approvals | Pending actions | First handoffs | Retries | Recommended next step |
|---|---|---:|---|---|---:|---:|---:|---:|---:|---|
| acceptance-closure | demo_like | 0 | warning | 3 out_of_bounds | 5 | 0 | 7 | 0 | 0 | Resolve the active blocker: Portfolio still has open questions; trade execution must remain blocked. |
| etf | active | 152977.9926173 | warning | 2 out_of_bounds | 0 | 0 | 1 | 0 | 0 | [contract_resolution_failed CH0032912732] Verify conid, symbol, exchange, and primary exchange before retrying. |

## Operator Queue Summary
- Total queue items: 8
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
- Workflow items: 0

## Cross-Portfolio Recommended Actions
1. [blocker/high/blocked] acceptance-closure: Holdings and pricing are still simulated. — Resolve the blocking condition before proceeding.
2. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max cash drag after full deployment. — Resolve the blocking condition before proceeding.
3. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max single ETF allocation. — Resolve the blocking condition before proceeding.
4. [blocker/high/blocked] acceptance-closure: Missing concrete risk limit: Max single issuer allocation. — Resolve the blocking condition before proceeding.
5. [blocker/high/blocked] acceptance-closure: Portfolio still has open questions; trade execution must remain blocked. — Resolve the blocking condition before proceeding.
6. [recovery/high/degraded] acceptance-closure: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001 — Restore broker connectivity before relying on broker-backed pricing or live execution paths.
7. [recovery/high/degraded] etf: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001 — Restore broker connectivity before relying on broker-backed pricing or live execution paths.
8. [delivery/medium/pending] acceptance-closure: Dashboard/report freshness is stale relative to source state. — Review report delivery readiness and clear the pending action.

## Notes
- This board is generated from Phase 29 structured summary artifacts rather than by re-deriving state directly from Markdown.
- Demo-like portfolios are surfaced explicitly so they do not silently disappear from operator review.
- Open phases are read from the maintained CURRENT_PLAN.md control file (legacy OPEN_PHASES_OVERVIEW.md still supported as a fallback).
