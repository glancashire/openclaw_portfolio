# Recovery Checklist: etf

## Incident Status
- Status: action_required
- Health: warning
- Broker health: degraded
- Execution posture: degraded_dry_run_only
- Delivery posture: ready
- Data freshness: current
- Pending approvals: 7
- Recommended next step: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.

## Why This Incident Exists
- Execution is blocked because broker readiness is degraded: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
- 7 approval-gated trade row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- Broker readiness is degraded, so broker-backed pricing/execution paths should be treated as unavailable until recovered.
- 7 approval-gated trade rows are still waiting for operator review.

## Active Blockers
1. No active blockers.

## Action Checklist
1. [high] Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
   - Action: Restore broker connectivity before relying on broker-backed pricing or live execution paths.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: broker_readiness
2. [medium] 7 proposed trade row(s) still need user approval.
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
1. [warn] Live execution requires explicit user approval flag. | Portfolio requires confirmation before first live trade. | Portfolio requires explicit user approval before the first live purchase. | Broker readiness is not healthy: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
2. [warn] Requested instrument is not in Approved Instruments.
3. [warn] Live execution requires explicit user approval flag. | Portfolio requires confirmation before first live trade. | Portfolio requires explicit user approval before the first live purchase. | Broker readiness is not healthy: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
4. [warn] Requested instrument is not in Approved Instruments.
