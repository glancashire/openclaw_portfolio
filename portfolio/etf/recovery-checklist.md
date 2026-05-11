# Recovery Checklist: etf

## Incident Status
- Status: monitor_only
- Health: attention_needed
- Broker health: healthy
- Execution posture: ready_for_review
- Delivery posture: needs_operator_attention
- Data freshness: current
- Pending approvals: 1
- Recommended next step: 1 reconciled fill(s) were detected after the live window and still need notification backfill review.

## Why This Incident Exists
- No explicit execution block is currently surfaced.
- 1 approval-gated trade row(s), 1 queued-for-open-runner row(s), 1 blocked row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- 1 approval-gated trade rows are still waiting for operator review.

## Active Blockers
1. No active blockers.

## Action Checklist
1. [medium] 1 reconciled fill(s) were detected after the live window and still need notification backfill review.
   - Action: Review the reconciled fill notification backfill state and decide whether to record a manual backfill outcome.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: fill_notification_state
2. [medium] 1 approved trade row(s) are ready for staging or review.
   - Action: Stage or review the approved trades when readiness gates are satisfied.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: trade_lifecycle
3. [medium] 1 trade row(s) were requeued for market-open retry after operator recovery.
   - Action: Re-check the prior blocker cause before allowing the retry handoff to proceed.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: trade_state

## Verification Checks
- Broker health remains healthy or intentionally degraded with operator awareness.
- Freshness posture remains current.
- All approval-gated rows are explicitly approved, rejected, or intentionally left pending.
- No active blockers remain.

## Completion Criteria
- Portfolio remains in a healthy or intentionally monitored posture.
- No blocker-class recovery work is outstanding.
- The next operating step is clear from the summary surface.

## Recent Signals
1. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
2. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
3. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
4. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
5. [warn] Holdings contain unmatched instruments: review instrument mapping
