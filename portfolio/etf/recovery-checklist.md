# Recovery Checklist: etf

## Incident Status
- Status: monitor_only
- Health: attention_needed
- Broker health: healthy
- Execution posture: ready_for_review
- Delivery posture: ready
- Data freshness: current
- Pending approvals: 0
- Recommended next step: Review and approve the current dry-run instrument proposals before broker connectivity is enabled.

## Why This Incident Exists
- No explicit execution block is currently surfaced.
- 29 blocked row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- No active incident drivers were detected; this checklist is a verification pass confirming healthy posture.

## Active Blockers
1. No active blockers.

## Active Broker Blocks
1. [insufficient_funds_or_buying_power] CH0032912732 — UBS SLI ETF (SMI gleichgewichtet)
   - Reason: Broker rejected the order because available cash or buying power was insufficient.
   - Next action: Reduce size or restore buying power, then retry.
   - Broker order id: 9127
2. [insufficient_funds_or_buying_power] IE000XZSV718 — State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc)
   - Reason: Broker rejected the order because available cash or buying power was insufficient.
   - Next action: Reduce size or restore buying power, then retry.
   - Broker order id: 9127
3. [insufficient_funds_or_buying_power] LU0950668870 — UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc
   - Reason: Broker rejected the order because available cash or buying power was insufficient.
   - Next action: Reduce size or restore buying power, then retry.
   - Broker order id: 9127
4. [insufficient_funds_or_buying_power] IE00BD4TXW66 — UBS Core S&P 500 UCITS ETF USD acc
   - Reason: Broker rejected the order because available cash or buying power was insufficient.
   - Next action: Reduce size or restore buying power, then retry.
   - Broker order id: 9127
5. [insufficient_funds_or_buying_power] IE00B5BMR087 — iShares Core S&P 500 UCITS ETF USD (Acc)
   - Reason: Broker rejected the order because available cash or buying power was insufficient.
   - Next action: Reduce size or restore buying power, then retry.
   - Broker order id: 9127
6. [insufficient_funds_or_buying_power] CH0130595124 — UBS SPI Mid ETF (SPI ohne SMI)
   - Reason: Broker rejected the order because available cash or buying power was insufficient.
   - Next action: Reduce size or restore buying power, then retry.
   - Broker order id: 9127

## Action Checklist
1. [low] Review and approve the current dry-run instrument proposals before broker connectivity is enabled.
   - Action: Review and approve the current dry-run instrument proposals before broker connectivity is enabled.
   - Verify: Confirm the queue item is resolved, acknowledged, or intentionally deferred with current operator understanding.
   - Source: recommendation_engine

## Verification Checks
- Broker health remains healthy or intentionally degraded with operator awareness.
- Freshness posture remains current.
- No approval backlog remains.
- No active blockers remain.

## Completion Criteria
- Portfolio remains in a healthy or intentionally monitored posture.
- No blocker-class recovery work is outstanding.
- The next operating step is clear from the summary surface.

## Recent Signals
1. [warn] Portfolio requires confirmation before first live trade.
2. [warn] Requested instrument is not in Approved Instruments.
3. [warn] CSPX blocked before submission: Interactive Brokers returned delayed-only market data for this instrument because the required market-data entitlement is not active.
4. [warn] Portfolio requires confirmation before first live trade.
5. [warn] Requested instrument is not in Approved Instruments.
