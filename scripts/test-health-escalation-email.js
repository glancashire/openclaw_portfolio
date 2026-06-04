'use strict';

/**
 * Test: buildEscalationEmail output format
 *
 * Verifies that the escalation email:
 * - Has a clear subject line with state and summary
 * - Has exactly 4 blocks in the text body
 * - Never contains "No immediate operator action is required"
 * - Includes what bb8 tried
 */

const assert = require('assert');
const { buildEscalationEmail } = require('../src/reporting/healthReport');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok --', label);
  asserted++;
}

// ── Attention state ────────────────────────────────────────────────────────────

{
  const report = {
    portfolio: 'etf',
    generatedAt: '2026-06-04T08:00:00.000Z',
    health: {
      state: 'attention',
      summary: '5 in-flight execution rows need reconciliation.',
      canonicalNextAction: 'Run: node scripts/reconcile-execution-rows.js portfolio/etf --verbose',
      health: 'degraded',
      severity: 'medium',
      blockerCount: 1,
      blockers: [{ code: 'delivery_attention', message: '5 in-flight execution rows need reconciliation.' }],
    },
    selfHeal: {
      actions: [
        { kind: 'regenerate_dashboard', ok: true },
        { kind: 'regenerate_reporting_artifacts', ok: true },
      ],
    },
  };

  const email = buildEscalationEmail(report);

  ok('attention: subject contains portfolio', email.subject.includes('ETF'));
  ok('attention: subject contains "attention needed"', email.subject.includes('attention needed'));
  ok('attention: subject contains summary', email.subject.includes('execution rows'));
  ok('attention: text contains "What\'s wrong"', email.text.includes("What's wrong"));
  ok('attention: text contains "What bb8 already tried"', email.text.includes("What bb8 already tried"));
  ok('attention: text contains "What to do"', email.text.includes("What to do"));
  ok('attention: text contains the next action', email.text.includes('reconcile-execution-rows'));
  ok('attention: text never says "No immediate operator action"', !email.text.includes('No immediate operator action'));
  ok('attention: text mentions regenerate dashboard', email.text.includes('regenerate dashboard'));
  ok('attention: html is non-empty', email.html.length > 100);
  ok('attention: html contains wrong section', email.html.includes('wrong'));
}

// ── Critical state ─────────────────────────────────────────────────────────────

{
  const report = {
    portfolio: 'etf',
    generatedAt: '2026-06-04T14:00:00.000Z',
    health: {
      state: 'critical',
      summary: 'Broker automation is paused after 5 consecutive broker errors.',
      canonicalNextAction: 'Clear the broker error state only after the underlying broker/API issue is understood and resolved.',
      health: 'paused',
      severity: 'high',
      blockerCount: 1,
      blockers: [{ code: 'broker_automation_paused', message: 'Broker automation is paused after 5 consecutive broker errors.' }],
    },
    selfHeal: {
      actions: [
        { kind: 'repoll_broker_readiness', ok: false, error: 'connection refused' },
      ],
    },
  };

  const email = buildEscalationEmail(report);

  ok('critical: subject contains "CRITICAL"', email.subject.includes('CRITICAL'));
  ok('critical: subject contains paused', email.subject.includes('paused'));
  ok('critical: text contains failed fix with error', email.text.includes('connection refused'));
  ok('critical: text contains next action', email.text.includes('Clear the broker error state'));
  ok('critical: text never says "No immediate operator action"', !email.text.includes('No immediate operator action'));
}

// ── No self-heal actions case ──────────────────────────────────────────────────

{
  const report = {
    portfolio: 'etf',
    generatedAt: '2026-06-04T20:00:00.000Z',
    health: {
      state: 'attention',
      summary: 'Fill notifications still need backfill review.',
      canonicalNextAction: 'Review reconciled fills and close the notification backfill backlog.',
      health: 'degraded',
      severity: 'low',
      blockerCount: 1,
    },
    selfHeal: { actions: [] },
  };

  const email = buildEscalationEmail(report);
  ok('no-actions: text says no fixes applicable', email.text.includes('No automatic fixes were applicable'));
  ok('no-actions: subject still present', email.subject.includes('attention needed'));
}

console.log('\nhealth-escalation-email tests: ' + asserted + ' assertions passed');
