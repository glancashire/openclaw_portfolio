# Recovery Checklist: etf

## Incident Status
- Status: action_required
- Health: warning
- Broker health: healthy
- Execution posture: ready_for_review
- Delivery posture: ready
- Data freshness: current
- Pending approvals: 0
- Recommended next step: 5 trade row(s) are marked failed and need operator review.

## Why This Incident Exists
- No explicit execution block is currently surfaced.
- 74 blocked row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- No active incident drivers were detected; this checklist is a verification pass confirming healthy posture.

## Active Blockers
1. No active blockers.

## Active Broker Blocks
1. [contract_resolution_failed] CH0032912732 — UBS SLI ETF (SMI gleichgewichtet)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
2. [contract_resolution_failed] IE000XZSV718 — State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
3. [contract_resolution_failed] LU0950668870 — UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
4. [contract_resolution_failed] IE00BD4TXW66 — UBS Core S&P 500 UCITS ETF USD acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
5. [contract_resolution_failed] IE00B5BMR087 — iShares Core S&P 500 UCITS ETF USD (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
6. [contract_resolution_failed] CH0130595124 — UBS SPI Mid ETF (SPI ohne SMI)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
7. [contract_resolution_failed] LU1781541252 — LU1781541252
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
8. [contract_resolution_failed] IE00B5L8K969 — IE00B5L8K969
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
9. [contract_resolution_failed] IE000I8KRLL9 — iShares MSCI Global Semiconductors UCITS ETF USD (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
10. [contract_resolution_failed] LU0950670850 — UBS MSCI United Kingdom UCITS ETF GBP acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
11. [contract_resolution_failed] IE00B44T3H88 — HSBC MSCI China UCITS ETF USD
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
12. [contract_resolution_failed] IE000X59ZHE2 — iShares AI Infrastructure UCITS ETF USD (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163
13. [contract_resolution_failed] IE00BGV5VN51 — Xtrackers Artificial Intelligence & Big Data UCITS ETF 1C
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9163

## Action Checklist
1. [high] 5 trade row(s) are marked failed and need operator review.
   - Action: Review the failed trade rows and resolve the root cause before retrying.
   - Verify: Confirm the blocking condition is cleared from the operator queue and no longer appears in blockers or status posture.
   - Source: trade_lifecycle

## Verification Checks
- Broker health remains healthy or intentionally degraded with operator awareness.
- Freshness posture remains current.
- No approval backlog remains.
- No active blockers remain.

## Completion Criteria
- Blocking recovery items no longer appear in the operator queue.
- Portfolio health no longer depends on unresolved blocker conditions.
- The operator can explain the current posture and next operating step without cross-referencing multiple artifacts.

## Recent Signals
1. [warn] Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
2. [warn] Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
3. [warn] Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
4. [warn] Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
5. [warn] Portfolio requires confirmation before first live trade.
