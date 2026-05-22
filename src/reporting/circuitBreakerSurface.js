'use strict';

/* Phase 199 — Circuit-breaker surface for operator overview. */

const path = require('path');
const { listCircuitBreakers } = require('../execution/cancelLoopBreaker');

function listCircuitBreakerSurfaceItems({ rootDir }) {
  const markers = listCircuitBreakers({ rootDir });
  return markers.map((m) => ({
    kind: 'circuit_breaker_tripped',
    portfolio: m.portfolio,
    instrument: m.instrument,
    severity: 'critical',
    urgency: 'high',
    summary: `Circuit breaker tripped for ${m.instrument}: ${m.count} consecutive cancellations (threshold ${m.threshold}).`,
    explanation: `Instrument ${m.instrument} has cancelled at the broker ${m.count} times in a row across approval ${m.latestApprovalId}; reproposals are now suspended for this instrument.`,
    effectIfAddressed: `Operator investigates upstream cause and runs scripts/clear-circuit-breaker.js to resume.`,
    effectIfIgnored: `${m.instrument} stays excluded from future reproposals; any sleeve drift toward this instrument will not auto-rebalance.`,
    recommendedOperatorAction: m.recommendedOperatorAction,
    firstTrippedAt: m.firstTrippedAt,
    lastSeenAt: m.lastSeenAt,
    lastBrokerOrderIds: m.lastBrokerOrderIds,
  }));
}

module.exports = { listCircuitBreakerSurfaceItems };
