# Recovery Checklist: etf

## Incident Status
- Status: monitor_only
- Health: attention_needed
- Broker health: healthy
- Execution posture: ready_for_review
- Delivery posture: ready
- Data freshness: current
- Pending approvals: 5
- Recommended next step: 5 proposed trade row(s) still need user approval.

## Why This Incident Exists
- Execution is waiting on explicit operator approval of proposed trade rows.
- 5 proposed row(s) still need approval, 11 blocked row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- 5 approval-gated trade rows are still waiting for operator review.

## Active Blockers
1. No active blockers.

## Active Broker Blocks
1. [broker_submit_rejected] IE00B5BMR087 — iShares Core S&P 500 UCITS ETF USD (Acc)
   - Reason: Broker rejected or inactivated the order: Order rejected - reason:Not allowed to open a position: no trading permission. You may need to add the appropriate trading permission <br>through Client Portal.
   - Next action: Review the broker rejection reason and correct the order before retrying.
   - Broker order id: 9122

## Action Checklist
1. [medium] 5 proposed trade row(s) still need user approval.
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
3. [warn] Portfolio requires confirmation before first live trade.
4. [warn] Requested instrument is not in Approved Instruments.
5. [warn] Portfolio requires confirmation before first live trade.
