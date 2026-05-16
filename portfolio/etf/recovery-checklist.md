# Recovery Checklist: etf

## Incident Status
- Status: action_required
- Health: warning
- Broker health: degraded
- Execution posture: degraded_dry_run_only
- Delivery posture: ready
- Data freshness: current
- Pending approvals: 1
- Recommended next step: 1 proposed trade row(s) still need user approval.

## Why This Incident Exists
- Execution is blocked because broker readiness is degraded: Interactive Brokers connectivity is available, but broker-backed pricing is not yet yielding a usable live/delayed quote posture.
- 1 proposed row(s) still need approval, 15 blocked row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- Broker readiness is degraded, so broker-backed pricing/execution paths should be treated as unavailable until recovered.
- 1 approval-gated trade rows are still waiting for operator review.

## Active Blockers
1. No active blockers.

## Active Broker Blocks
1. [quote_unavailable] CH0032912732 — UBS SLI ETF (SMI gleichgewichtet)
   - Reason: No broker quote was available during market-open execution.
   - Next action: Restore broker pricing and rerun the market-open submission path.
   - Broker order id: n/a

## Action Checklist
1. [high] Interactive Brokers connectivity is available, but broker-backed pricing is not yet yielding a usable live/delayed quote posture.
   - Action: Restore broker connectivity before relying on broker-backed pricing or live execution paths.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: broker_readiness
2. [medium] 1 proposed trade row(s) still need user approval.
   - Action: Review the proposed trades and approve or reject them explicitly.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: trade_lifecycle

## Verification Checks
- Broker health returns to healthy or the operator intentionally keeps the portfolio in draft-only mode.
- Freshness posture remains current.
- All approval-gated rows are explicitly approved, rejected, or intentionally left pending.
- No active blockers remain.

## Completion Criteria
- Blocking recovery items no longer appear in the operator queue.
- Portfolio health no longer depends on unresolved blocker conditions.
- The operator can explain the current posture and next operating step without cross-referencing multiple artifacts.

## Recent Signals
1. [warn] UBSSLI blocked before submission: No broker quote was available during market-open execution.
2. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
3. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
4. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
5. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
