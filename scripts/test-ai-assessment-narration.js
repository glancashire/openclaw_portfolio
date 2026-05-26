'use strict';

/**
 * Tests for the async narrateAssessment() in lib/aiAssessment.js.
 * All model calls are stubbed; no live network.
 */

const assert = require('assert');
const { assessPortfolio, narrateAssessment } = require('../lib/aiAssessment');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}

function buildPlan() {
  return {
    totals: { totalChf: 50000, cashChf: 7000 },
    legs: [
      { symbol: 'SXR8',     actualPct: 35.0, targetPct: 40, driftPct: -5.0,  valueChf: 17500, gapChf: 2500 },
      { symbol: 'SPMCHA',   actualPct: 15.7, targetPct: 8,  driftPct: 7.7,   valueChf: 7850,  gapChf: -3850 },
      { symbol: 'CASH-CHF', actualPct: 14.0, targetPct: 20, driftPct: -6.0,  valueChf: 7000,  gapChf: 3000 },
    ],
    scenarios: { sell_overshoot: { sellsChf: 3850, buysChf: 3850, cashNeededChf: 0, leftoverDriftPp: 1.3 } },
    warnings: [],
  };
}

(async () => {
  const baseAssessment = assessPortfolio({ plan: buildPlan(), navHistory: [], summary: { approvals: {} } });
  ok('base assessment has drift_alert tag', baseAssessment.tags.includes('drift_alert'));

  // 1. no model client → rules fallback
  {
    const out = await narrateAssessment({ assessment: baseAssessment, modelClient: null });
    ok('null client → source=rules',    out.source === 'rules');
    ok('null client → lead preserved',   out.lead === baseAssessment.lead);
    ok('null client → tags preserved',   JSON.stringify(out.tags) === JSON.stringify(baseAssessment.tags));
  }

  // 2. unavailable model client → rules fallback
  {
    const client = { available: false, complete: async () => ({ text: 'should not be called' }) };
    const out = await narrateAssessment({ assessment: baseAssessment, modelClient: client });
    ok('unavailable client → source=rules', out.source === 'rules');
  }

  // 3. happy model path
  {
    let sawSystem = null, sawUser = null;
    const client = {
      available: true,
      provider: 'anthropic',
      complete: async ({ system, user }) => { sawSystem = system; sawUser = user; return { text: 'SPMCHA is 7.7pp over target; recommend trimming 4k CHF to bring drift to ~1pp.' }; },
    };
    const out = await narrateAssessment({
      assessment: baseAssessment,
      context: { portfolio: 'etf', plan: buildPlan(), summary: { approvals: { pendingApprovalCount: 0 } }, navHistory: [] },
      modelClient: client,
    });
    ok('model success → source=model',           out.source === 'model');
    ok('model success → lead is model text',     /SPMCHA is 7.7pp/.test(out.lead));
    ok('model success → tags unchanged',         JSON.stringify(out.tags) === JSON.stringify(baseAssessment.tags));
    ok('model success → details unchanged',      JSON.stringify(out.details) === JSON.stringify(baseAssessment.details));
    ok('model success → system prompt present',  typeof sawSystem === 'string' && sawSystem.length > 0);
    ok('model success → user payload mentions SPMCHA', /SPMCHA/.test(sawUser));
    ok('model success → user payload is JSON-wrapped', /```json/.test(sawUser));
  }

  // 4. model error → rules fallback
  {
    const client = {
      available: true,
      provider: 'anthropic',
      complete: async () => { throw new Error('429 rate-limit'); },
    };
    const out = await narrateAssessment({ assessment: baseAssessment, modelClient: client });
    ok('model throws → source=rules',  out.source === 'rules');
    ok('model throws → lead preserved', out.lead === baseAssessment.lead);
  }

  // 5. model returns empty → rules fallback
  {
    const client = { available: true, provider: 'anthropic', complete: async () => ({ text: '   ' }) };
    const out = await narrateAssessment({ assessment: baseAssessment, modelClient: client });
    ok('model empty → source=rules', out.source === 'rules');
  }

  // 6. model returns fenced markdown → fences stripped, newlines collapsed
  {
    const client = {
      available: true, provider: 'anthropic',
      complete: async () => ({ text: '```\nLine one.\nLine two.\n```' }),
    };
    const out = await narrateAssessment({ assessment: baseAssessment, modelClient: client });
    ok('sanitize: fences stripped',     !/```/.test(out.lead));
    ok('sanitize: newlines collapsed',  !/\n/.test(out.lead) && /Line one\. Line two\./.test(out.lead));
  }

  // 7. assessment missing → throws
  {
    let threw = null;
    try { await narrateAssessment({ assessment: null }); } catch (e) { threw = e; }
    ok('null assessment → throws', threw !== null);
  }

  console.log(JSON.stringify({ ok: true, asserted }));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
