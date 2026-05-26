#!/usr/bin/env node
'use strict';

/*
 * Tests for lib/aiAssessment.js
 */

const assert = require('assert');
const { assessPortfolio } = require('../lib/aiAssessment');

let passed = 0;
function ok(label) { passed += 1; console.log(`  ok — ${label}`); }

function planWith(legs) {
  return { legs, totals: { netLiqChf: 50000 } };
}

// === 1. nominal: no triggers fire ===
{
  const plan = planWith([
    { symbol: 'SXR8',     driftPct:  0.5, actualPct: 40.5, targetPct: 40, gapChf: -250 },
    { symbol: 'EMUAA',    driftPct: -0.3, actualPct: 19.7, targetPct: 20, gapChf:  150 },
    { symbol: 'CASH-CHF', driftPct:  1.0, actualPct: 21.0, targetPct: 20, gapChf: -500 },
  ]);
  const out = assessPortfolio({ plan, navHistory: [], summary: { approvals: { pendingApprovalCount: 0 } } });
  assert.deepStrictEqual(out.tags, ['nominal']);
  assert(/within target bands/i.test(out.lead));
  ok('nominal: zero drift, no approvals -> tags=[nominal]');
}

// === 2. drift_alert fires and leads ===
{
  const plan = planWith([
    { symbol: 'SPMCHA',   driftPct: 7.7, actualPct: 15.7, targetPct: 8, gapChf: -4000 },
    { symbol: 'CASH-CHF', driftPct: 0,   actualPct: 20,   targetPct: 20, gapChf: 0 },
  ]);
  const out = assessPortfolio({ plan });
  assert(out.tags.includes('drift_alert'));
  assert.strictEqual(out.tags[0], 'drift_alert', 'drift_alert must be first in tags');
  assert(/SPMCHA/.test(out.lead));
  assert(/7\.7pp/.test(out.lead));
  ok('drift_alert: SPMCHA over by 7.7pp leads');
}

// === 3. nav_drawdown fires ===
{
  const today = new Date('2026-05-26T00:00:00Z').toISOString().slice(0, 10);
  const sevenAgo = new Date('2026-05-19T00:00:00Z').toISOString().slice(0, 10);
  const navHistory = [
    { date: sevenAgo, totalChf: 52000 },
    { date: today, totalChf: 49000 },  // -5.77%
  ];
  const out = assessPortfolio({ plan: planWith([{ symbol: 'CASH-CHF', driftPct: 0, actualPct: 20, targetPct: 20 }]), navHistory });
  assert(out.tags.includes('nav_drawdown'));
  assert(/down/i.test(out.lead));
  assert(/5\.7/.test(out.lead));
  ok('nav_drawdown: -5.77% over 7 days fires');
}

// === 4. drift_alert beats nav_drawdown in lead order ===
{
  const today = new Date('2026-05-26T00:00:00Z').toISOString().slice(0, 10);
  const sevenAgo = new Date('2026-05-19T00:00:00Z').toISOString().slice(0, 10);
  const navHistory = [
    { date: sevenAgo, totalChf: 52000 },
    { date: today,    totalChf: 49000 },  // -5.77%
  ];
  const plan = planWith([
    { symbol: 'SPMCHA',   driftPct: 7.7, actualPct: 15.7, targetPct: 8, gapChf: -4000 },
    { symbol: 'CASH-CHF', driftPct: 0,   actualPct: 20,   targetPct: 20 },
  ]);
  const out = assessPortfolio({ plan, navHistory });
  assert.deepStrictEqual(out.tags.slice(0, 2).sort(), ['drift_alert', 'nav_drawdown']);
  assert(/SPMCHA/.test(out.lead), 'drift_alert must lead over nav_drawdown');
  ok('drift_alert leads over nav_drawdown by precedence');
}

// === 5. awaiting_approval ===
{
  const plan = planWith([{ symbol: 'CASH-CHF', driftPct: 0, actualPct: 20, targetPct: 20 }]);
  const summary = { approvals: { pendingApprovalCount: 2 } };
  const out = assessPortfolio({ plan, summary });
  assert(out.tags.includes('awaiting_approval'));
  assert(/2 approval/.test(out.lead));
  ok('awaiting_approval fires when pendingApprovalCount > 0');
}

// === 6. cash_above_target ===
{
  const plan = planWith([{ symbol: 'CASH-CHF', driftPct: 7, actualPct: 27, targetPct: 20, valueChf: 13500 }]);
  const out = assessPortfolio({ plan });
  assert(out.tags.includes('cash_above_target'));
  assert(/ready to deploy/i.test(out.lead));
  ok('cash_above_target fires when cash drift > +5pp');
}

// === 7. cash_below_target ===
{
  const plan = planWith([{ symbol: 'CASH-CHF', driftPct: -7, actualPct: 13, targetPct: 20, valueChf: 6500 }]);
  const out = assessPortfolio({ plan });
  assert(out.tags.includes('cash_below_target'));
  assert(/topping up/i.test(out.lead));
  ok('cash_below_target fires when cash drift < -5pp');
}

// === 8. Multiple tags + correct precedence sort ===
{
  const today = new Date('2026-05-26T00:00:00Z').toISOString().slice(0, 10);
  const sevenAgo = new Date('2026-05-19T00:00:00Z').toISOString().slice(0, 10);
  const plan = planWith([
    { symbol: 'SPMCHA',   driftPct: 7.7, actualPct: 15.7, targetPct: 8, gapChf: -4000 },
    { symbol: 'CASH-CHF', driftPct: -7,  actualPct: 13,   targetPct: 20, valueChf: 6500 },
  ]);
  const navHistory = [
    { date: sevenAgo, totalChf: 52000 },
    { date: today,    totalChf: 49000 },  // -5.77%
  ];
  const summary = { approvals: { pendingApprovalCount: 1 } };
  const out = assessPortfolio({ plan, navHistory, summary });
  // All four tags should fire.
  for (const tag of ['drift_alert', 'nav_drawdown', 'awaiting_approval', 'cash_below_target']) {
    assert(out.tags.includes(tag), `${tag} expected`);
  }
  // Lead should be drift_alert (highest precedence).
  assert(/SPMCHA/.test(out.lead));
  ok('multiple tags fire; drift_alert wins lead');
}

// === 9. Robustness: empty inputs ===
{
  const out = assessPortfolio({});
  assert.deepStrictEqual(out.tags, ['nominal']);
  ok('empty inputs -> nominal (no crash)');
}

// === 10. Custom thresholds ===
{
  const plan = planWith([
    { symbol: 'SXR8',     driftPct: 3, actualPct: 43, targetPct: 40 },
    { symbol: 'CASH-CHF', driftPct: 0, actualPct: 20, targetPct: 20 },
  ]);
  // Default: 3pp drift does NOT trigger drift_alert (threshold is 5).
  let out = assessPortfolio({ plan });
  assert(!out.tags.includes('drift_alert'));
  // Lowered threshold: triggers.
  out = assessPortfolio({ plan, thresholds: { driftAlertThresholdPp: 2 } });
  assert(out.tags.includes('drift_alert'));
  ok('custom thresholds override defaults');
}

console.log(JSON.stringify({ ok: true, asserted: passed }));
