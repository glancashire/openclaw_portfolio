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

module.exports = { assessPortfolio, DEFAULTS };
