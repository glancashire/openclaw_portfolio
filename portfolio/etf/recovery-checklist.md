# Recovery Checklist: etf

## Incident Status
- Status: monitor_only
- Health: attention_needed
- Broker health: healthy
- Execution posture: ready_for_review
- Delivery posture: ready
- Data freshness: current
- Pending approvals: 1
- Recommended next step: 1 proposed trade row(s) still need user approval.

## Why This Incident Exists
- Execution is waiting on explicit operator approval of proposed trade rows.
- 1 proposed row(s) still need approval, 15 blocked row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- 1 approval-gated trade rows are still waiting for operator review.

## Active Blockers
1. No active blockers.

## Active Broker Blocks
1. [quote_unavailable] CH0032912732 — UBS SLI ETF (SMI gleichgewichtet)
   - Reason: No broker quote was available during market-open execution.
   - Next action: Restore broker pricing and rerun the market-open submission path.
   - Broker order id: n/a

## Action Checklist
1. [medium] 1 proposed trade row(s) still need user approval.
   - Action: Review the proposed trades and approve or reject them explicitly.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: trade_lifecycle

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
1. [warn] Portfolio requires confirmation before first live trade.
2. [warn] Requested instrument is not in Approved Instruments.
3. [warn] UBSSLI blocked before submission: No broker quote was available during market-open execution.
4. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
5. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
