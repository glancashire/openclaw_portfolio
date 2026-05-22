'use strict';

/* Phase 205 — regression: renderApprovalsQueueMarkdown surfaces envelope
 * annotations (requiresOperatorAttention, currencyDeployment) as inline bullets.
 */

const assert = require('assert');
const path = require('path');
const realRoot = path.resolve(__dirname, '..');
const { renderApprovalsQueueMarkdown } = require(path.join(realRoot, 'src/reporting/summaryArtifacts'));

(async () => {
  // ── Case 1: item with full annotations ──
  const queueWithAnnotations = {
    generatedAt: '2026-05-22T16:00:00Z',
    itemCount: 1,
    items: [{
      rank: 1,
      portfolio: 'etf',
      urgency: 'high',
      summary: 'Reproposal v1 pending approval',
      explanation: 'Cancelled leg awaiting fresh approval.',
      effectIfApproved: 'Transmits via canonical runner.',
      effectIfIgnored: 'Leg stays unfilled.',
      recommendedOperatorAction: 'Reply approve.',
      requiresOperatorAttention: true,
      quoteQualitySummary: { tiers: { stale_only: 1, live: 0 }, attentionLegIds: ['leg-1'] },
      currencyDeployment: { CHF: 2479.5, EUR: 6910.20 },
    }],
  };

  const md1 = renderApprovalsQueueMarkdown(queueWithAnnotations);
  assert(md1.includes('⚠️ Requires attention'), 'attention bullet rendered');
  assert(md1.includes('stale_only=1'), 'tier counts rendered');
  assert(md1.includes('Native deployment:'), 'deployment bullet rendered');
  assert(md1.includes('CHF 2479.5'), 'CHF amount rendered');
  assert(md1.includes('EUR 6910.2'), 'EUR amount rendered');

  // ── Case 2: item WITHOUT annotations (older envelope) — must not render new bullets ──
  const queueLegacy = {
    generatedAt: '2026-05-22T16:00:00Z',
    itemCount: 1,
    items: [{
      rank: 1,
      portfolio: 'etf',
      urgency: 'medium',
      summary: 'Legacy item',
      explanation: 'No annotations.',
      effectIfApproved: 'X',
      effectIfIgnored: 'Y',
      recommendedOperatorAction: 'Z',
      // requiresOperatorAttention undefined; currencyDeployment undefined.
    }],
  };
  const md2 = renderApprovalsQueueMarkdown(queueLegacy);
  assert(!md2.includes('Requires attention'), 'no attention bullet when not set');
  assert(!md2.includes('Native deployment'), 'no deployment bullet when not set');

  // ── Case 3: empty queue — preserves original placeholder ──
  const empty = renderApprovalsQueueMarkdown({ generatedAt: '2026-05-22T16:00:00Z', itemCount: 0, items: [] });
  assert(empty.includes('No pending approval items'), 'empty placeholder preserved');

  // ── Case 4: currencyDeployment empty object → no bullet ──
  const queueEmptyDeployment = {
    generatedAt: '2026-05-22T16:00:00Z',
    itemCount: 1,
    items: [{
      rank: 1, portfolio: 'etf', urgency: 'low', summary: 'X', explanation: 'X',
      effectIfApproved: 'X', effectIfIgnored: 'X', recommendedOperatorAction: 'X',
      currencyDeployment: {},
    }],
  };
  const md4 = renderApprovalsQueueMarkdown(queueEmptyDeployment);
  assert(!md4.includes('Native deployment'), 'no bullet when currencyDeployment is empty object');

  console.log(JSON.stringify({ ok: true, testsPassed: 4 }));
})().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
