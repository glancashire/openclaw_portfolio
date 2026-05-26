'use strict';

/**
 * lib/aiAssessment.js
 *
 * Deterministic, rule-based portfolio assessor. Takes structured inputs
 * (rebalance plan, NAV history, portfolio summary) and produces a short
 * commentary + structured tag block for the daily digest.
 *
 * Rule precedence:
 *   1. drift_alert       — any leg with |drift| > driftAlertThresholdPp
 *   2. nav_drawdown      — netLiq has dropped > navDrawdownPct over the trend window
 *   3. awaiting_approval — pending approvals > 0
 *   4. cash_above_target — cash above target by > cashAboveTargetThresholdPp
 *   5. cash_below_target — cash below target by > cashBelowTargetThresholdPp (operator may want to top up)
 *   6. nominal           — none of the above; portfolio is healthy
 *
 * Multiple tags can fire; lead is determined by precedence above.
 *
 * The assessor is intentionally NOT a model call. A future enhancement
 * could swap in a model call producing the same { lead, tags, details }
 * shape; the rest of the digest pipeline doesn't change.
 */

const DEFAULTS = Object.freeze({
  driftAlertThresholdPp:        5,
  navDrawdownPct:               3,
  cashAboveTargetThresholdPp:   5,
  cashBelowTargetThresholdPp:   5,
  trendWindowDays:              7,
});

/**
 * @param {object} params
 * @param {object} [params.plan]    rebalance plan from computeRebalancePlan()
 * @param {Array}  [params.navHistory]  [{ date, totalChf }]
 * @param {object} [params.summary] dashboard portfolio summary
 * @param {object} [params.thresholds]
 * @returns {{lead: string, tags: string[], details: object[]}}
 */
function assessPortfolio({ plan = null, navHistory = [], summary = null, thresholds = {} } = {}) {
  const t = { ...DEFAULTS, ...thresholds };

  const tags = [];
  const details = [];

  // --- Rule 1: drift_alert ---
  const driftAlert = findWorstDriftLeg(plan, t.driftAlertThresholdPp);
  if (driftAlert) {
    tags.push('drift_alert');
    details.push({
      tag: 'drift_alert',
      symbol: driftAlert.symbol,
      driftPp: driftAlert.driftPct,
      gapChf: driftAlert.gapChf,
      summary: `${driftAlert.symbol} is ${signed(driftAlert.driftPct)}pp from target (${driftAlert.actualPct}% vs ${driftAlert.targetPct}%)`,
    });
  }

  // --- Rule 2: nav_drawdown ---
  const drawdown = computeDrawdown(navHistory, t.trendWindowDays);
  if (drawdown && drawdown.deltaPct < -t.navDrawdownPct) {
    tags.push('nav_drawdown');
    details.push({
      tag: 'nav_drawdown',
      windowDays: drawdown.windowDays,
      deltaPct: drawdown.deltaPct,
      deltaChf: drawdown.deltaChf,
      summary: `NetLiq down ${Math.abs(drawdown.deltaPct).toFixed(2)}% over the last ${drawdown.windowDays} day(s) (CHF ${drawdown.deltaChf.toFixed(0)})`,
    });
  }

  // --- Rule 3: awaiting_approval ---
  const pending = Number(summary?.approvals?.pendingApprovalCount || 0);
  if (pending > 0) {
    tags.push('awaiting_approval');
    details.push({
      tag: 'awaiting_approval',
      count: pending,
      summary: `${pending} approval(s) waiting for action`,
    });
  }

  // --- Rule 4 & 5: cash deviation ---
  const cashLeg = (plan?.legs || []).find((l) => l.symbol === 'CASH-CHF');
  if (cashLeg) {
    if (cashLeg.driftPct > t.cashAboveTargetThresholdPp) {
      tags.push('cash_above_target');
      details.push({
        tag: 'cash_above_target',
        cashChf: cashLeg.valueChf,
        driftPp: cashLeg.driftPct,
        summary: `Cash is ${signed(cashLeg.driftPct)}pp above target — ready to deploy`,
      });
    } else if (cashLeg.driftPct < -t.cashBelowTargetThresholdPp) {
      tags.push('cash_below_target');
      details.push({
        tag: 'cash_below_target',
        cashChf: cashLeg.valueChf,
        driftPp: cashLeg.driftPct,
        summary: `Cash is ${signed(cashLeg.driftPct)}pp below target — consider topping up if planning more buys`,
      });
    }
  }

  if (tags.length === 0) {
    tags.push('nominal');
    details.push({
      tag: 'nominal',
      summary: 'Portfolio is within target bands and no immediate action is required',
    });
  }

  // Lead = highest-priority tag's summary.
  const priority = ['drift_alert', 'nav_drawdown', 'awaiting_approval', 'cash_above_target', 'cash_below_target', 'nominal'];
  const leadTag = priority.find((p) => tags.includes(p)) || tags[0];
  const leadDetail = details.find((d) => d.tag === leadTag);
  const lead = leadDetail ? leadDetail.summary : '';

  return { lead, tags, details };
}

function findWorstDriftLeg(plan, thresholdPp) {
  if (!plan || !Array.isArray(plan.legs)) return null;
  let worst = null;
  for (const l of plan.legs) {
    if (l.symbol === 'CASH-CHF') continue;
    if (Math.abs(l.driftPct) <= thresholdPp) continue;
    if (!worst || Math.abs(l.driftPct) > Math.abs(worst.driftPct)) worst = l;
  }
  return worst;
}

function computeDrawdown(navHistory, windowDays) {
  if (!Array.isArray(navHistory) || navHistory.length < 2) return null;
  const sorted = [...navHistory].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const last = sorted[sorted.length - 1];
  const lastDate = new Date(last.date);
  const cutoff = new Date(lastDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
  // Find earliest entry within window (or take oldest if all are within window)
  const inWindow = sorted.filter((row) => new Date(row.date) >= cutoff);
  if (inWindow.length < 2) return null;
  const first = inWindow[0];
  const startVal = Number(first.totalChf || 0);
  const endVal   = Number(last.totalChf || 0);
  if (!Number.isFinite(startVal) || !Number.isFinite(endVal) || startVal === 0) return null;
  const deltaChf = endVal - startVal;
  const deltaPct = (deltaChf / startVal) * 100;
  return { windowDays, startChf: startVal, endChf: endVal, deltaChf, deltaPct };
}

function signed(n) {
  if (!Number.isFinite(n)) return '0';
  return n > 0 ? `+${n}` : `${n}`;
}

/**
 * Optionally narrate the assessment via a model call.
 *
 * Inputs:
 *   - assessment   = result of assessPortfolio(...)
 *   - context      = { portfolio, plan, summary, navHistory }  // shape free
 *   - modelClient  = lib/modelClient.js client (or null)
 *
 * Output: { lead, tags, details, narrated, source }
 *   - source = 'model' | 'rules'  (rules = fallback)
 *   - narrated = the prose string used as the lead
 *
 * On any error or unavailable client, returns the rule-based assessment
 * with source='rules'. Tags + details are always preserved verbatim.
 */
async function narrateAssessment({ assessment, context = {}, modelClient = null } = {}) {
  if (!assessment || !Array.isArray(assessment.tags)) {
    throw new Error('narrateAssessment: assessment required');
  }
  const fallback = {
    lead:     assessment.lead,
    tags:     assessment.tags,
    details:  assessment.details,
    narrated: assessment.lead,
    source:   'rules',
  };
  if (!modelClient || !modelClient.available || typeof modelClient.complete !== 'function') {
    return fallback;
  }
  try {
    const { system, user } = buildPrompts(assessment, context);
    const { text } = await modelClient.complete({ system, user, maxTokens: 240 });
    const narrated = sanitizeNarration(text);
    if (!narrated) return fallback;
    return {
      lead:     narrated,
      tags:     assessment.tags,
      details:  assessment.details,
      narrated,
      source:   'model',
    };
  } catch (_err) {
    return fallback;
  }
}

function buildPrompts(assessment, context) {
  const portfolio = context.portfolio || 'portfolio';
  const summary = context.summary || {};
  const plan = context.plan || {};
  const navHistory = Array.isArray(context.navHistory) ? context.navHistory.slice(-7) : [];

  const system = [
    'You are a concise portfolio commentator.',
    'Write ONE short paragraph (max 3 sentences, ~60 words) summarising the state.',
    'Be factual, neutral, and direct. No greetings, no disclaimers, no markdown, no bullet points.',
    'Lead with the most load-bearing observation from the supplied tags.',
    'Use CHF for cash amounts. Round percentages to one decimal.',
  ].join(' ');

  const userPayload = {
    portfolio,
    leadTag: assessment.tags[0],
    tags: assessment.tags,
    details: assessment.details,
    totals: plan.totals || null,
    legs: (plan.legs || []).map((l) => ({
      symbol:    l.symbol,
      actualPct: l.actualPct,
      targetPct: l.targetPct,
      driftPct:  l.driftPct,
    })),
    navTrend: navHistory.map((row) => ({ date: row.date, totalChf: row.totalChf })),
    pendingApprovals: Number(summary?.approvals?.pendingApprovalCount || 0),
  };
  const user = [
    'Generate the daily commentary paragraph for this portfolio:',
    '```json',
    JSON.stringify(userPayload, null, 2),
    '```',
  ].join('\n');

  return { system, user };
}

function sanitizeNarration(text) {
  if (typeof text !== 'string') return '';
  let t = text.trim();
  // Strip wrapping code fences if any.
  t = t.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  // Collapse newlines to spaces; the digest renders this as a single paragraph.
  t = t.replace(/\s*\n\s*/g, ' ').trim();
  // Hard cap to keep the digest tight.
  if (t.length > 800) t = t.slice(0, 800).trim() + '…';
  return t;
}

module.exports = { assessPortfolio, narrateAssessment, DEFAULTS };

