# Recovery Checklist: etf

## Incident Status
- Status: monitor_only
- Health: attention_needed
- Broker health: healthy
- Execution posture: ready_for_review
- Delivery posture: ready
- Data freshness: current
- Pending approvals: 0
- Recommended next step: Review current allocation versus strategic targets before generating any fresh live basket.

## Why This Incident Exists
- No explicit execution block is currently surfaced.
- 39 blocked row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- No active incident drivers were detected; this checklist is a verification pass confirming healthy posture.

## Active Blockers
1. No active blockers.

## Active Broker Blocks
1. [contract_resolution_failed] CH0032912732 — UBS SLI ETF (SMI gleichgewichtet)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9140
2. [contract_resolution_failed] IE000XZSV718 — State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9140
3. [contract_resolution_failed] LU0950668870 — UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9140
4. [contract_resolution_failed] IE00BD4TXW66 — UBS Core S&P 500 UCITS ETF USD acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9140
5. [contract_resolution_failed] IE00B5BMR087 — iShares Core S&P 500 UCITS ETF USD (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9140
6. [contract_resolution_failed] CH0130595124 — UBS SPI Mid ETF (SPI ohne SMI)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9140
7. [contract_resolution_failed] LU1781541252 — Amundi Core MSCI Japan UCITS ETF Acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9140
8. [contract_resolution_failed] IE00B5L8K969 — iShares MSCI EM Asia UCITS ETF (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9140

## Action Checklist
1. [low] Review current allocation versus strategic targets before generating any fresh live basket.
   - Action: Review current allocation versus strategic targets before generating any fresh live basket.
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
3. [warn] Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
4. [warn] Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
5. [warn] Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
