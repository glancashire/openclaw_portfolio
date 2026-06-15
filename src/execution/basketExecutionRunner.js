'use strict';

const fs = require('fs');
const path = require('path');
const { loadApprovalEnvelope } = require('./basketApprovalStore');
const { stagePortfolioOrder } = require('./portfolioExecution');
const { prepareOrderForSubmission } = require('./orderPreparation');

const BASKET_RUN_SCHEMA_VERSION = '1.0';

function runsRoot(rootDir = process.cwd()) {
  return path.join(rootDir, 'runtime', 'basket-runs');
}

function runPath({ portfolio, approvalId, rootDir = process.cwd() }) {
  if (!portfolio) throw new Error('portfolio is required');
  if (!approvalId) throw new Error('approvalId is required');
  return path.join(runsRoot(rootDir), portfolio, `${approvalId}.json`);
}

function loadOrCreateRunState({ portfolio, approvalId, rootDir = process.cwd(), now = new Date() }) {
  const outPath = runPath({ portfolio, approvalId, rootDir });
  if (fs.existsSync(outPath)) {
    return { path: outPath, state: JSON.parse(fs.readFileSync(outPath, 'utf8')) };
  }
  const state = {
    schemaVersion: BASKET_RUN_SCHEMA_VERSION,
    portfolio,
    approvalId,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    status: 'pending',
    legs: {},
    summary: {
      total: 0,
      executed: 0,
      blocked: 0,
      failed: 0,
      submitted: 0,
    },
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2));
  return { path: outPath, state };
}

function persistRunState(outPath, state, now = new Date()) {
  state.updatedAt = new Date(now).toISOString();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(state, null, 2));
  return outPath;
}

function legAttemptCount(runState, legId) {
  return Number(runState?.legs?.[legId]?.attempts || 0);
}

function legEligible(leg = {}, runState = {}) {
  const attempts = legAttemptCount(runState, leg.legId);
  const maxAttempts = Number(leg.maxAttempts || 1);
  if (String(leg.status || '').trim().toLowerCase() !== 'approved') {
    return { ok: false, code: 'leg_not_approved', reason: `Leg ${leg.legId} is not in approved status.` };
  }
  if (attempts >= maxAttempts) {
    return { ok: false, code: 'attempt_limit_reached', reason: `Leg ${leg.legId} has already used ${attempts}/${maxAttempts} attempts.` };
  }
  return { ok: true, attempts, remainingAttempts: maxAttempts - attempts };
}

function summarizeRun(runState = {}) {
  const legs = Object.values(runState.legs || {});
  const filled = legs.filter((leg) => leg.status === 'filled').length;
  const cancelled = legs.filter((leg) => leg.status === 'cancelled').length;
  runState.summary = {
    total: legs.length,
    executed: legs.filter((leg) => ['submitted', 'filled', 'partially_filled'].includes(leg.status)).length,
    blocked: legs.filter((leg) => leg.status === 'blocked').length,
    failed: legs.filter((leg) => leg.status === 'failed').length,
    submitted: legs.filter((leg) => leg.status === 'submitted').length,
    filled,
    cancelled,
  };
  if (runState.summary.failed > 0 && runState.summary.executed === 0 && runState.summary.blocked === 0) runState.status = 'failed';
  else if (filled > 0 && (cancelled > 0 || runState.summary.failed > 0 || runState.summary.blocked > 0)) runState.status = 'partial';
  else if (filled === runState.summary.total && runState.summary.total > 0) runState.status = 'filled';
  else if (runState.summary.executed > 0 && (runState.summary.blocked > 0 || runState.summary.failed > 0)) runState.status = 'partial';
  else if (runState.summary.executed === runState.summary.total && runState.summary.total > 0) runState.status = 'submitted';
  else if (runState.summary.blocked === runState.summary.total && runState.summary.total > 0) runState.status = 'blocked';
  return runState;
}

async function executeApprovedBasket({ portfolioDir, approvalId, rootDir = process.cwd(), now = new Date(), submitLeg = null, fetchLiveQuote = null, fxLookup = null, tickResolverFn = null, safeguardConfig = {} } = {}) {
  const portfolio = path.basename(portfolioDir);
  const { envelope } = loadApprovalEnvelope({ portfolio, approvalId, rootDir, now });
  const { path: statePath, state } = loadOrCreateRunState({ portfolio, approvalId, rootDir, now });

  // Pre-flight safeguards (Phase L, 2026-06-05): validate the whole basket
  // BEFORE any leg is sent. Refuses on sell-without-envelope-approval,
  // limit price too far from market, oversized leg/basket, or stale quote.
  // See src/execution/orderSafeguards.js.
  if (typeof fetchLiveQuote === 'function') {
    const { evaluateBasketSafeguards } = require('./orderSafeguards');
    const guardResult = await evaluateBasketSafeguards({
      envelope,
      fetchLiveQuote,
      fxLookup: fxLookup || (() => 1),
      config: safeguardConfig,
    });
    if (!guardResult.ok) {
      const blockerSummary = guardResult.blockers.map((b) => `${b.legId || 'basket'}:${b.code}:${b.reason}`).join(' | ');
      // Mark every leg blocked with a structured reason.
      for (const leg of envelope.legs || []) {
        const blocker = guardResult.blockers.find((b) => b.legId === leg.legId) || guardResult.blockers[0];
        state.legs[leg.legId] = {
          legId: leg.legId,
          instrument: leg.instrument,
          attempts: 0,
          status: 'blocked',
          lastReason: `safeguard_${blocker?.code || 'unknown'}: ${blocker?.reason || blockerSummary}`,
          safeguardDetail: blocker?.detail || null,
          updatedAt: new Date(now).toISOString(),
        };
      }
      persistRunState(statePath, summarizeRun(state), now);
      return { path: statePath, runState: summarizeRun(state), approvalId, portfolio, safeguardBlockers: guardResult.blockers };
    }
  }

  // Phase L1.B (2026-06-05): daily transmit cap. Refuse if today's already-
  // transmitted notional plus this basket would breach the daily cap.
  // Defaults to CHF 50k (matches the per-basket cap, so the conservative
  // read is "one basket per day at the cap"). Override via
  // safeguardConfig.dailyTransmitCapChf.
  if (safeguardConfig.skipDailyTransmitCap !== true) {
    const { evaluateDailyTransmitCap } = require('./dailyTransmitCap');
    const capChf = Number.isFinite(safeguardConfig.dailyTransmitCapChf)
      ? Number(safeguardConfig.dailyTransmitCapChf)
      : undefined;
    const dailyResult = evaluateDailyTransmitCap({
      portfolio,
      rootDir,
      envelope,
      fxLookup: fxLookup || (() => 1),
      now,
      capChf,
    });
    if (!dailyResult.ok) {
      for (const leg of envelope.legs || []) {
        state.legs[leg.legId] = {
          legId: leg.legId,
          instrument: leg.instrument,
          attempts: 0,
          status: 'blocked',
          lastReason: `safeguard_${dailyResult.code}: ${dailyResult.reason}`,
          safeguardDetail: {
            capChf: dailyResult.capChf,
            usedToday: dailyResult.used,
            requested: dailyResult.requested,
            remaining: dailyResult.remaining,
            byApproval: dailyResult.byApproval,
          },
          updatedAt: new Date(now).toISOString(),
        };
      }
      persistRunState(statePath, summarizeRun(state), now);
      return {
        path: statePath,
        runState: summarizeRun(state),
        approvalId,
        portfolio,
        safeguardBlockers: [{
          code: dailyResult.code,
          reason: dailyResult.reason,
          detail: {
            capChf: dailyResult.capChf,
            usedToday: dailyResult.used,
            requested: dailyResult.requested,
            remaining: dailyResult.remaining,
          },
        }],
      };
    }
  }

  for (const leg of envelope.legs || []) {
    const eligibility = legEligible(leg, state);
    if (!eligibility.ok) {
      state.legs[leg.legId] = {
        ...(state.legs[leg.legId] || {}),
        legId: leg.legId,
        instrument: leg.instrument,
        attempts: legAttemptCount(state, leg.legId),
        status: eligibility.code === 'attempt_limit_reached' ? 'blocked' : 'failed',
        lastReason: eligibility.reason,
        updatedAt: new Date(now).toISOString(),
      };
      persistRunState(statePath, summarizeRun(state), now);
      continue;
    }

    // Pre-flight tick validation: ensure limitPrice conforms to IBKR market rules.
    // Prefer the live/cached market-rule tick for this contract+venue+price; fall
    // back to the static price-tier table when no resolver is wired or it fails.
    const { tickForPrice, roundToTick } = require('./basketReproposalBuilder');
    let expectedTick = tickForPrice(leg.limitPrice);
    if (typeof tickResolverFn === 'function') {
      try {
        const resolved = await tickResolverFn({
          conid: leg.conid,
          venue: leg.primaryExchange || leg.exchange,
          currency: leg.currency,
          price: leg.limitPrice,
        });
        const rt = Number(resolved && (resolved.tick != null ? resolved.tick : resolved));
        if (Number.isFinite(rt) && rt > 0) expectedTick = rt;
      } catch (_) { /* keep static tick */ }
    }
    const remainder = Math.abs((leg.limitPrice / expectedTick) % 1);
    const tickValid = remainder < 1e-9 || Math.abs(remainder - 1) < 1e-9;
    if (!tickValid) {
      const corrected = roundToTick(leg.limitPrice, expectedTick);
      leg.limitPrice = corrected;
      leg._tickCorrected = true;
      leg._tickUsed = expectedTick;
    }

    const order = prepareOrderForSubmission({
      identifier: leg.conid || leg.instrument,
      conid: leg.conid || null,
      symbol: leg.ibkrSymbol || null,
      action: leg.action,
      quantity: leg.quantity,
      limitPrice: leg.limitPrice,
      currency: leg.currency,
      exchange: leg.exchange || 'SMART',
      primaryExchange: leg.primaryExchange || null,
      userApproved: true,
      transmittedLiveAck: 'I UNDERSTAND THIS WILL TRANSMIT A LIVE ORDER',
      transmit: true,
    }, {
      ibkrConid: leg.conid,
      ibkrSymbol: leg.ibkrSymbol,
      ibkrPrimaryExchange: leg.primaryExchange,
      currency: leg.currency,
    }, { enforceMarketHours: false });

    const executor = submitLeg || (async ({ portfolioDir: targetPortfolioDir, order: targetOrder }) => stagePortfolioOrder({
      portfolioDir: targetPortfolioDir,
      order: targetOrder,
      dryRun: false,
      revocableOnly: true,
      transmitLive: true,
    }));

    const result = await executor({ portfolioDir, order, leg, envelope, runState: state });
    const attempts = legAttemptCount(state, leg.legId) + 1;
    state.legs[leg.legId] = {
      legId: leg.legId,
      instrument: leg.instrument,
      attempts,
      status: result?.ok ? 'submitted' : result?.reason === 'policy_blocked' ? 'blocked' : 'failed',
      brokerOrderId: result?.brokerResult?.order?.orderId || null,
      lastReason: result?.error || result?.reason || null,
      updatedAt: new Date(now).toISOString(),
    };
    persistRunState(statePath, summarizeRun(state), now);
  }

  return { path: statePath, runState: summarizeRun(state), approvalId, portfolio };
}

function classifyBrokerOutcome({ orderId, executions = [], completedOrders = [], leg = null }) {
  const idStr = String(orderId);
  const fills = (executions || []).filter((row) => String(row.orderId) === idStr);
  if (fills.length > 0) {
    const totalShares = fills.reduce((sum, f) => sum + Number(f.shares || f.quantity || 0), 0);
    const totalNotional = fills.reduce((sum, f) => sum + (Number(f.shares || f.quantity || 0) * Number(f.price || 0)), 0);
    const avgFillPrice = totalShares > 0 ? Number((totalNotional / totalShares).toFixed(6)) : null;
    return {
      status: 'filled',
      fillQuantity: totalShares,
      avgFillPrice,
      executionIds: fills.map((f) => f.execId).filter(Boolean),
    };
  }
  const completed = (completedOrders || []).find((row) => {
    if (!row) return false;
    const status = String(row.status || row.completedStatus || row.state || '').toLowerCase();
    if (!status.includes('cancel')) return false;
    const candidateIds = [
      row.orderId,
      row.orderID,
      row.permId,
      row.permID,
      row.brokerOrderId,
      row.order?.orderId,
      row.order?.orderID,
    ].filter((value) => value !== undefined && value !== null && String(value).trim() !== '');
    if (candidateIds.length === 0) return false;
    return candidateIds.some((value) => String(value) == idStr);
  });
  if (completed) {
    return {
      status: 'cancelled',
      cancelledReason: completed.completedStatus || completed.status || 'cancelled',
    };
  }
  const fallbackCancelled = (completedOrders || []).find((row) => {
    if (!row || !leg) return false;
    const status = String(row.status || row.completedStatus || row.state || '').toLowerCase();
    if (!status.includes('cancel')) return false;
    const hintSymbol = String(row.symbol || row.contract?.symbol || '').trim().toUpperCase();
    const legSymbol = String(leg.ibkrSymbol || '').trim().toUpperCase();
    if (!hintSymbol || !legSymbol || hintSymbol != legSymbol) return false;
    const hintQty = Number(row.quantity ?? row.qty ?? row.totalQuantity ?? row.order?.totalQuantity ?? NaN);
    const legQty = Number(leg.quantity ?? NaN);
    if (Number.isFinite(hintQty) && Number.isFinite(legQty) && hintQty !== legQty) return false;
    if (Number.isFinite(hintQty) !== Number.isFinite(legQty)) return false;
    return true;
  });
  if (fallbackCancelled) {
    return {
      status: 'cancelled',
      cancelledReason: fallbackCancelled.completedStatus || fallbackCancelled.status || 'cancelled',
    };
  }
  return { status: 'unknown' };
}

function reconcileBasketRunFromBroker({ portfolio, approvalId, rootDir = process.cwd(), executions = [], completedOrders = [], now = new Date() } = {}) {
  const outPath = runPath({ portfolio, approvalId, rootDir });
  if (!fs.existsSync(outPath)) {
    throw new Error(`Basket run state not found: ${outPath}`);
  }
  const state = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  let proposalLegs = [];
  try {
    const proposalPath = path.join(rootDir, 'runtime', 'basket-proposals', portfolio, `${approvalId}.json`);
    const approvedPath = path.join(rootDir, 'runtime', 'approved-order-baskets', portfolio, `${approvalId}.json`);
    const sourcePath = fs.existsSync(proposalPath) ? proposalPath : approvedPath;
    if (fs.existsSync(sourcePath)) {
      proposalLegs = JSON.parse(fs.readFileSync(sourcePath, 'utf8')).legs || [];
    }
  } catch (_) {}
  for (const leg of Object.values(state.legs || {})) {
    if (!leg.brokerOrderId) continue;
    if (['filled', 'cancelled'].includes(leg.status)) continue;
    const proposalLeg = proposalLegs.find((entry) => entry.legId === leg.legId) || null;
    const outcome = classifyBrokerOutcome({ orderId: leg.brokerOrderId, executions, completedOrders, leg: proposalLeg });
    if (outcome.status === 'unknown') continue;
    Object.assign(leg, outcome, { updatedAt: new Date(now).toISOString() });
  }
  return persistRunState(outPath, summarizeRun(state), now);
}

module.exports = {
  BASKET_RUN_SCHEMA_VERSION,
  runsRoot,
  runPath,
  loadOrCreateRunState,
  persistRunState,
  legAttemptCount,
  legEligible,
  summarizeRun,
  executeApprovedBasket,
  classifyBrokerOutcome,
  reconcileBasketRunFromBroker,
};
