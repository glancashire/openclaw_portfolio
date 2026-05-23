# Recovery Checklist: etf

## Incident Status
- Status: action_required
- Health: warning
- Broker health: degraded
- Execution posture: degraded_dry_run_only
- Delivery posture: ready
- Data freshness: current
- Pending approvals: 0
- Recommended next step: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001

## Why This Incident Exists
- Execution is blocked because broker readiness is degraded: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
- 34 blocked row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- Broker readiness is degraded, so broker-backed pricing/execution paths should be treated as unavailable until recovered.

## Active Blockers
1. No active blockers.

## Active Broker Blocks
1. [contract_resolution_failed] CH0032912732 — CH0032912732
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9129
2. [contract_resolution_failed] IE000XZSV718 — State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9129
3. [contract_resolution_failed] LU0950668870 — LU0950668870
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9129
4. [contract_resolution_failed] IE00BD4TXW66 — UBS Core S&P 500 UCITS ETF USD acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9129
5. [contract_resolution_failed] IE00B5BMR087 — IE00B5BMR087
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9129
6. [contract_resolution_failed] CH0130595124 — UBS SPI Mid ETF (SPI ohne SMI)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9129

## Action Checklist
1. [high] Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
   - Action: Restore broker connectivity before relying on broker-backed pricing or live execution paths.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: broker_readiness

## Verification Checks
- Broker health returns to healthy or the operator intentionally keeps the portfolio in draft-only mode.
- Freshness posture remains current.
- No approval backlog remains.
- No active blockers remain.

## Completion Criteria
- Blocking recovery items no longer appear in the operator queue.
- Portfolio health no longer depends on unresolved blocker conditions.
- The operator can explain the current posture and next operating step without cross-referencing multiple artifacts.

## Recent Signals
1. [warn] Portfolio requires confirmation before first live trade. | Broker readiness is not healthy: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
2. [warn] Requested instrument is not in Approved Instruments.
3. [warn] Portfolio requires confirmation before first live trade. | Broker readiness is not healthy: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
4. [warn] Requested instrument is not in Approved Instruments.
5. [warn] Portfolio requires confirmation before first live trade. | Broker readiness is not healthy: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
