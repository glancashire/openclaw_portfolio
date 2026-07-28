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
- 78 blocked row(s) still need explicit operator review before the workflow can advance cleanly.

## Incident Drivers
- Broker readiness is degraded, so broker-backed pricing/execution paths should be treated as unavailable until recovered.

## Active Blockers
1. No active blockers.

## Active Broker Blocks
1. [contract_resolution_failed] CH0032912732 — UBS SLI ETF (SMI gleichgewichtet)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
2. [contract_resolution_failed] IE000XZSV718 — State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
3. [contract_resolution_failed] LU0950668870 — UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
4. [contract_resolution_failed] IE00BD4TXW66 — UBS Core S&P 500 UCITS ETF USD acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
5. [contract_resolution_failed] IE00B5BMR087 — iShares Core S&P 500 UCITS ETF USD (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
6. [contract_resolution_failed] CH0130595124 — UBS SPI Mid ETF (SPI ohne SMI)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
7. [contract_resolution_failed] LU1781541252 — LU1781541252
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
8. [contract_resolution_failed] IE00B5L8K969 — IE00B5L8K969
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
9. [contract_resolution_failed] IE000I8KRLL9 — iShares MSCI Global Semiconductors UCITS ETF USD (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
10. [contract_resolution_failed] LU0950670850 — UBS MSCI United Kingdom UCITS ETF GBP acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
11. [contract_resolution_failed] IE00B44T3H88 — HSBC MSCI China UCITS ETF USD
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
12. [contract_resolution_failed] IE000X59ZHE2 — iShares AI Infrastructure UCITS ETF USD (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
13. [contract_resolution_failed] IE00BGV5VN51 — Xtrackers Artificial Intelligence & Big Data UCITS ETF 1C
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
14. [contract_resolution_failed] IE00BLNMYC90 — Xtrackers S&P 500 Equal Weight UCITS ETF 1C
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
15. [contract_resolution_failed] IE000OEF25S1 — Invesco MSCI World Equal Weight UCITS ETF Acc
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
16. [contract_resolution_failed] IE00BCLWRD08 — iShares MSCI EMU Mid Cap UCITS ETF EUR (Acc)
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
17. [contract_resolution_failed] LU0322248146 — Xtrackers SLI UCITS ETF 1D
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
18. [contract_resolution_failed] IE00BM67HM91 — Xtrackers MSCI World Energy UCITS ETF 1C
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
19. [contract_resolution_failed] IE000M7V94E1 — VanEck Uranium and Nuclear Technologies UCITS ETF
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
20. [contract_resolution_failed] IE000U58J0M1 — iShares Global Clean Energy Transition UCITS ETF
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172
21. [contract_resolution_failed] IE00BJ38QD84 — SPDR Russell 2000 US Small Cap UCITS ETF
   - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
   - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
   - Broker order id: 9172

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
3. [warn] Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
4. [warn] Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
5. [warn] Missing concrete risk limit: Max single ETF allocation. | Missing concrete risk limit: Max single issuer allocation. | Missing concrete risk limit: Max cash drag after full deployment.
