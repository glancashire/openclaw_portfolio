'use strict';

/**
 * Test: health state derivation from classifyPortfolioHealth
 *
 * Verifies the new `state`, `summary`, `canonicalNextAction` fields
 * are consistent with the blocker/severity classification.
 */

const assert = require('assert');
const { classifyPortfolioHealth } = require('../src/execution/portfolioHealth');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok --', label);
  asserted++;
}

// Helpers: minimal input shapes
function healthy() {
  return classifyPortfolioHealth({
    brokerReadiness: { reachable: true, authenticated: true, fallbackRequired: false },
    errorState: { stopAutomation: false, consecutive: 0 },
    staleApprovedRows: [],
    retryState: { queuedRetry: 0, queuedInitial: 0 },
    deliveryStatus: { pendingActions: [] },
    fillNotificationState: { reconciledUnnotifiedFills: [] },
  });
}

function withBrokerDown() {
  return classifyPortfolioHealth({
    brokerReadiness: { reachable: false, authenticated: false, fallbackRequired: true, message: 'IBKR gateway unreachable.' },
    errorState: { stopAutomation: false, consecutive: 0 },
    staleApprovedRows: [],
    retryState: { queuedRetry: 0, queuedInitial: 0 },
    deliveryStatus: { pendingActions: [] },
    fillNotificationState: { reconciledUnnotifiedFills: [] },
  });
}

function withAutomationPaused() {
  return classifyPortfolioHealth({
    brokerReadiness: { reachable: true, authenticated: true, fallbackRequired: false },
    errorState: { stopAutomation: true, consecutive: 5 },
    staleApprovedRows: [],
    retryState: { queuedRetry: 0, queuedInitial: 0 },
    deliveryStatus: { pendingActions: [] },
    fillNotificationState: { reconciledUnnotifiedFills: [] },
  });
}

function withStaleApprovals() {
  return classifyPortfolioHealth({
    brokerReadiness: { reachable: true, authenticated: true, fallbackRequired: false },
    errorState: { stopAutomation: false, consecutive: 0 },
    staleApprovedRows: [{ tickerOrIsin: 'ABC', action: 'buy', approvalAgeHours: 100, reason: 'old', refreshCommand: '' }],
    retryState: { queuedRetry: 0, queuedInitial: 0 },
    deliveryStatus: { pendingActions: [] },
    fillNotificationState: { reconciledUnnotifiedFills: [] },
  });
}

function withDeliveryPending() {
  return classifyPortfolioHealth({
    brokerReadiness: { reachable: true, authenticated: true, fallbackRequired: false },
    errorState: { stopAutomation: false, consecutive: 0 },
    staleApprovedRows: [],
    retryState: { queuedRetry: 0, queuedInitial: 0 },
    deliveryStatus: { pendingActions: ['5 in-flight execution row(s) need reconciliation'] },
    fillNotificationState: { reconciledUnnotifiedFills: [] },
  });
}

// ── Healthy ───────────────────────────────────────────────────────────────────

{
  const r = healthy();
  ok('healthy: state=healthy', r.state === 'healthy');
  ok('healthy: summary', r.summary === 'All systems normal.');
  ok('healthy: canonicalNextAction=null', r.canonicalNextAction === null);
  ok('healthy: blockerCount=0', r.blockerCount === 0);
  ok('healthy: health=healthy', r.health === 'healthy');
}

// ── Critical: broker down ─────────────────────────────────────────────────────

{
  const r = withBrokerDown();
  ok('broker-down: state=critical', r.state === 'critical');
  ok('broker-down: summary mentions IBKR', r.summary.toLowerCase().includes('ibkr') || r.summary.toLowerCase().includes('broker'));
  ok('broker-down: canonicalNextAction non-null', r.canonicalNextAction !== null);
  ok('broker-down: severity=high', r.severity === 'high');
}

// ── Critical: automation paused ────────────────────────────────────────────────

{
  const r = withAutomationPaused();
  ok('paused: state=critical', r.state === 'critical');
  ok('paused: summary mentions paused', r.summary.toLowerCase().includes('paused'));
  ok('paused: canonicalNextAction non-null', r.canonicalNextAction !== null);
}

// ── Attention: stale approvals ─────────────────────────────────────────────────

{
  const r = withStaleApprovals();
  ok('stale-approvals: state=attention', r.state === 'attention');
  ok('stale-approvals: summary mentions stale', r.summary.toLowerCase().includes('stale'));
  ok('stale-approvals: canonicalNextAction non-null', r.canonicalNextAction !== null);
  ok('stale-approvals: severity=medium', r.severity === 'medium');
}

// ── Attention: delivery pending (has blocker but not critical) ──────────────────

{
  const r = withDeliveryPending();
  ok('delivery-pending: state=attention', r.state === 'attention');
  ok('delivery-pending: summary mentions execution or reconciliation', r.summary.toLowerCase().includes('execution') || r.summary.toLowerCase().includes('reconcil'));
  ok('delivery-pending: canonicalNextAction is null (no recommended action for delivery-only)', r.canonicalNextAction === null);
}

// ── No contradictions rule ─────────────────────────────────────────────────────

{
  // When state is healthy, nextAction legacy field should still say "No immediate..."
  // but canonicalNextAction must be null
  const r = healthy();
  ok('no-contradiction: healthy → legacy nextAction polite string', r.nextAction.includes('No immediate'));
  ok('no-contradiction: healthy → canonicalNextAction null', r.canonicalNextAction === null);
}

{
  // When state is attention, canonicalNextAction should NOT be the "No immediate..." fallback
  const r = withStaleApprovals();
  ok('no-contradiction: attention → canonicalNextAction is concrete', r.canonicalNextAction !== null && !r.canonicalNextAction.includes('No immediate'));
}

console.log('\nhealth-state-derivation tests: ' + asserted + ' assertions passed');
