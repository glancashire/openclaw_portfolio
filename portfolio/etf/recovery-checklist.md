# Recovery Checklist: etf

## Incident Status
- Status: action_required
- Health: warning
- Broker health: degraded
- Execution posture: degraded_dry_run_only
- Delivery posture: needs_operator_attention
- Data freshness: current
- Pending approvals: 1
- Recommended next step: 1 reconciled fill(s) were detected after the live window and still need notification backfill review.

## Why This Incident Exists
- Execution is blocked because broker readiness is degraded: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
- 1 approval-gated trade row(s), 1 queued-for-open-runner row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- Broker readiness is degraded, so broker-backed pricing/execution paths should be treated as unavailable until recovered.
- 1 approval-gated trade rows are still waiting for operator review.

## Active Blockers
1. No active blockers.

## Active Broker Blocks
1. No broker-derived trade blocks are currently recorded.

## Action Checklist
1. [high] Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
   - Action: Restore broker connectivity before relying on broker-backed pricing or live execution paths.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: broker_readiness
2. [medium] 1 reconciled fill(s) were detected after the live window and still need notification backfill review.
   - Action: Review the reconciled fill notification backfill state and decide whether to record a manual backfill outcome.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: fill_notification_state
3. [medium] 1 approved trade row(s) are ready for staging or review.
   - Action: Stage or review the approved trades when readiness gates are satisfied.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: trade_lifecycle
4. [medium] 1 trade row(s) are queued for a first market-open handoff.
   - Action: Confirm the queued rows are still intended before the next market-open run.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: trade_state

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
1. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
2. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
3. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
4. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
5. [warn] Holdings contain unmatched instruments: review instrument mapping
