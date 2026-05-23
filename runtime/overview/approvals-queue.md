# Approvals Queue

## Summary
- Generated at: 2026-05-23T13:12:59.195Z
- Approval items: 1

## Approval Review Queue

### Approval 1: etf
- Urgency: high
- Summary: Circuit breaker tripped for CH0130595124: 3 consecutive cancellations (threshold 3).
- Explanation: Instrument CH0130595124 has cancelled at the broker 3 times in a row across approval basket-etf-20260522T1041-reproposal-3-reproposal-1; reproposals are now suspended for this instrument.
- Effect if approved: undefined
- Effect if ignored: CH0130595124 stays excluded from future reproposals; any sleeve drift toward this instrument will not auto-rebalance.
- Recommended action: Investigate why CH0130595124 keeps cancelling at the broker (subscription, liquidity, contract config). When fixed, run: node scripts/clear-circuit-breaker.js --portfolio=etf --instrument=CH0130595124
