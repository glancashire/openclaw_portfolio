# Recovery Checklist: etf

## Incident Status
- Status: monitor_only
- Health: warning
- Broker health: healthy
- Execution posture: ready_for_review
- Delivery posture: needs_operator_attention
- Data freshness: stale
- Pending approvals: 1
- Recommended next step: 1 approved trade row(s) are ready for staging or review.

## Why This Incident Exists
- Execution is blocked because the underlying portfolio state is stale and should be refreshed first.
- 1 approval-gated trade row(s), 5 blocked row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- Data freshness is stale, so recommendations and execution paths should be treated as suspect until refreshed.
- 1 approval-gated trade rows are still waiting for operator review.

## Active Blockers
1. No active blockers.

## Active Broker Blocks
1. [quote_unavailable] CH0032912732 — UBS SLI ETF (SMI gleichgewichtet)
   - Reason: No broker quote was available during market-open execution.
   - Next action: Restore broker pricing and rerun the market-open submission path.
   - Broker order id: n/a

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
4. [medium] Dashboard/report freshness is stale relative to source state.
   - Action: Review report delivery readiness and clear the pending action.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: delivery_policy

## Verification Checks
- Broker health remains healthy or intentionally degraded with operator awareness.
- Dashboard, holdings, and summary inputs are refreshed until the stale posture clears.
- All approval-gated rows are explicitly approved, rejected, or intentionally left pending.
- No active blockers remain.

## Completion Criteria
- Portfolio remains in a healthy or intentionally monitored posture.
- No blocker-class recovery work is outstanding.
- The next operating step is clear from the summary surface.

## Recent Signals
1. [warn] UBSSLI blocked before submission: No broker quote was available during market-open execution.
2. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
3. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
4. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
5. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
