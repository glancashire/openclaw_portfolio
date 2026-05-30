const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateDashboard, buildPendingOperatorActions, buildMaterialEvents, bestNextStep } = require('../src/reporting/dashboardGenerator');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const pending = buildPendingOperatorActions({
    deliveryStatus: { pendingActions: ['Delivery readiness needs review.'] },
    brokerReadiness: { fallbackRequired: true, message: 'IBKR unavailable' },
    brokerErrorState: { stopAutomation: false },
    lifecycleSummary: { approved: 2, submitted: 1, partiallyFilled: 0 },
    openRunnerRetryState: { queuedInitial: 1, queuedRetry: 1 },
    safetyDiagnostics: { holdingsHealth: { stalePricing: true } },
    recommended: ['Review proposals now.'],
  });
  assert(pending.length >= 4, 'Expected rich pending action queue');

  const events = buildMaterialEvents([
    { timestamp: '2026-05-06T13:49:27.490Z', action: 'draft_execution_blocked', level: 'warn', status: 'blocked', summary: 'Requested instrument is not approved.' },
    { timestamp: '2026-05-06T13:50:23.490Z', action: 'live_execution_blocked', level: 'warn', status: 'blocked', summary: 'Live execution blocked.' },
  ]);
  assert(events[0].nextStep.includes('Resolve'), 'Expected blocked event next step');

  const recommendation = bestNextStep({
    pendingActions: pending,
    blockers: [],
    recommendedActionsList: ['Fallback recommendation'],
    brokerReadiness: { fallbackRequired: true },
    lifecycleSummary: { approved: 2 },
  });
  assert(recommendation === pending[0], 'Expected pending queue to drive best next step');

  const dashboard = await generateDashboard({
    portfolioName: 'demo',
    holdingsText: `## Last Sync\n- Date/time: 2026-05-03 10:00:00\n- Total value CHF: 5000\n- Cash CHF: 5000\n- Invested value CHF: 0`,
    allocations: [
      { assetClass: 'Global equities', current: 0, target: 60, drift: -60, status: 'out_of_bounds' },
    ],
    approvedInstruments: [
      { tickerOrIsin: 'AAA', name: 'ETF A', target: 60 },
    ],
    existingTrades: [
      { date: '2026-05-03 10:03:00', action: 'buy', instrument: 'ETF D', estimatedChf: '1600', status: 'failed' },
    ],
    latestProposals: [
      { tickerOrIsin: 'AAA', status: 'proposed', action: 'buy', estimatedChf: '1000', reason: 'Deploy cash; target drift correction', approval: 'pending_user_approval' },
    ],
    executionPlan: { rows: [], totals: { intendedChf: 0, executableChf: 0, executionGapChf: 0 } },
    latestSnapshot: { date: '2026-05-03', dailyChange: '0', dailyChangePct: '0', notes: 'demo snapshot' },
    brokerReadiness: { fallbackRequired: true, message: 'gateway unavailable', guidance: 'Restore native connectivity first. Detail: connect ECONNREFUSED 127.0.0.1:4001' },
    lifecycleSummary: { proposed: 1, approved: 1, rejected: 0, staged: 0, submitted: 1, partiallyFilled: 0, filled: 0, cancelled: 0, failed: 1, planned: 0, withBrokerOrderId: 1 },
    openRunnerRetryState: { queuedInitial: 1, queuedRetry: 1 },
    freshness: { stale: false, dashboardExists: true, newestSourcePath: 'holdings.md' },
    brokerErrorState: { stopAutomation: false, consecutive: 0 },
    deliveryStatus: { ready: false, latestHistoryDate: '2026-05-03', deliveryMode: 'local_only', failureAlertMode: 'local_operator_review', pendingActions: ['Delivery readiness needs review.'] },
    observability: { eventsPathPresent: true, recentSummary: { total: 2, blockedTrades: 2, degradedBrokerEvents: 1, staleDataEvents: 0 } },
    safetyDiagnostics: { blockers: [{ severity: 'error', message: 'Portfolio still has open questions; trade execution must remain blocked.' }], diagnostics: { holdingsHealth: { stalePricing: false } } },
    recentEvents: [
      { timestamp: '2026-05-06T13:49:27.490Z', action: 'draft_execution_blocked', level: 'warn', status: 'blocked', summary: 'Requested instrument is not approved.' },
    ],
  });

  // Section order: Portfolio Value → Profit/Loss → Holdings → Instrument Actions →
  // Balance Check → Pending Operator Actions → Immediate Status → Health Snapshot
  // → Safety → Recent Events → Report/Delivery → Recommended Next Step
  const requiredSections = [
    '## Portfolio Value Snapshot',
    '## Profit / Loss',
    '## Holdings',
    '## Instrument Actions Queue',
    '## Balance Check',
    '## Pending Operator Actions',
    '## Immediate Status',
    '## Health Snapshot',
    '## Safety / Risk Diagnostics',
    '## Recent Material Events',
    '## Report / Delivery Status',
    '## Recommended Next Step',
  ];

  for (const section of requiredSections) {
    assert(dashboard.includes(section), `Expected section ${section}`);
  }

  assert(dashboard.indexOf('## Portfolio Value Snapshot') < dashboard.indexOf('## Profit / Loss'), 'Expected portfolio value before profit/loss');
  assert(dashboard.indexOf('## Profit / Loss') < dashboard.indexOf('## Holdings'), 'Expected profit/loss before holdings');
  assert(dashboard.indexOf('## Balance Check') < dashboard.indexOf('## Pending Operator Actions'), 'Expected balance check before pending operator actions');
  assert(dashboard.indexOf('## Pending Operator Actions') < dashboard.indexOf('## Immediate Status'), 'Expected pending operator actions before immediate status');
  assert(dashboard.indexOf('## Immediate Status') < dashboard.indexOf('## Health Snapshot'), 'Expected immediate status before health snapshot');
  assert(dashboard.indexOf('## Health Snapshot') < dashboard.indexOf('## Safety / Risk Diagnostics'), 'Expected health snapshot before safety diagnostics');
  assert(/Portfolio status: warning/i.test(dashboard), 'Expected health label');
  assert(/Top blocker: gateway unavailable/i.test(dashboard), 'Expected broker fallback top blocker near top');
  assert(/Next action: Restore native connectivity first\. Detail: connect ECONNREFUSED 127\.0\.0\.1:4001/i.test(dashboard), 'Expected broker-driven next action near top');
  assert(/Broker health: gateway unavailable/i.test(dashboard), 'Expected broker health line');
  assert(/draft_execution_blocked/i.test(dashboard), 'Expected recent material event row');
  assert(/Open-runner first handoffs: 1/i.test(dashboard), 'Expected first-handoff queue summary in dashboard');
  assert(/Open-runner retries: 1/i.test(dashboard), 'Expected retry queue summary in dashboard');
  assert(/\[open_runner_queue\/ready_for_review\/medium\]/i.test(dashboard), 'Expected first-handoff pending action row');
  assert(/\[open_runner_retry\/ready_for_review\/medium\]/i.test(dashboard), 'Expected retry pending action row');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
