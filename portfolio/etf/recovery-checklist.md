# Recovery Checklist: etf

## Incident Status
- Status: action_required
- Health: warning
- Broker health: healthy
- Execution posture: ready_for_review
- Delivery posture: needs_operator_attention
- Data freshness: current
- Pending approvals: 3
- Recommended next step: 4 trade row(s) are marked failed and need operator review.

## Why This Incident Exists
- No explicit execution block is currently surfaced.
- 3 approval-gated trade row(s), 3 queued-for-open-runner row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- 3 approval-gated trade rows are still waiting for operator review.

## Active Blockers
1. No active blockers.

## Action Checklist
1. [high] 4 trade row(s) are marked failed and need operator review.
   - Action: Review the failed trade rows and resolve the root cause before retrying.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: trade_lifecycle
2. [medium] 3 approved trade row(s) are ready for staging or review.
   - Action: Stage or review the approved trades when readiness gates are satisfied.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: trade_lifecycle
3. [medium] 3 trade row(s) were requeued for market-open retry after operator recovery.
   - Action: Re-check the prior blocker cause before allowing the retry handoff to proceed.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: trade_state
4. [medium] 4 trade row(s) are marked failed and need operator review.
   - Action: Review report delivery readiness and clear the pending action.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: delivery_policy

## Verification Checks
- Broker health remains healthy or intentionally degraded with operator awareness.
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
3. [info] Queued IE00B5BMR087 buy for market-open runner retry after operator recovery.
4. [warn] CSPX blocked before submission: Could not determine a smart limit price from broker quote data.
5. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
