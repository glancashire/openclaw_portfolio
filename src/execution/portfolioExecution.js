const fs = require('fs');
const path = require('path');
const { InteractiveBrokersClient } = require('../brokers/interactive-brokers/client');
const { readApprovedInstruments } = require('../analysis/approvedInstruments');
const { evaluateSafetyControls } = require('../validation/safetyControls');
const { getInteractiveBrokersReadiness } = require('../brokers/interactive-brokers/readiness');
const { appendTradeProposals } = require('../analysis/tradeLogWriter');
const { appendHistorySnapshot } = require('../analysis/historyWriter');
const { regenerateDashboard } = require('../reporting/dashboardGenerator');
const { syncInteractiveBrokersHoldings } = require('../brokers/interactive-brokers/holdingsSync');
const { markTradeApproved, reconcileOrderStatus, appendTradeEvent } = require('./tradeState');
const { recordBrokerError, clearBrokerErrors, brokerErrorStatus } = require('./runtimeState');

function parsePortfolioStatus(text) {
  return captureLine(text, 'Status');
}

function parseExecutionMode(text) {
  return captureLine(text, 'Execution mode');
}

function parseBrokerAccountReference(text) {
  return captureLine(text, 'Broker account reference');
}

function parseBooleanLine(text, label) {
  const value = captureLine(text, label);
  if (!value) return null;
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  if (/^yes$/i.test(value)) return true;
  if (/^no$/i.test(value)) return false;
  return null;
}

function captureLine(text, label) {
  const match = text.match(new RegExp(`- ${escapeRegex(label)}:\\s*(.+)`));
  return match ? match[1].trim() : null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseHoldingsHealth(holdingsText) {
  const unmatchedMatch = holdingsText.match(/- Unmatched holdings:\s*(.+)/);
  const pricingMatch = holdingsText.match(/- Pricing source:\s*(.+)/);
  const syncTimeMatch = holdingsText.match(/- Date\/time:\s*(.+)/);
  const unmatched = unmatchedMatch ? unmatchedMatch[1].trim() : 'unknown';
  const pricingSource = pricingMatch ? pricingMatch[1].trim() : 'unknown';
  const syncTime = syncTimeMatch ? syncTimeMatch[1].trim() : null;
  return {
    unmatched,
    pricingSource,
    syncTime,
    hasUnmatched: unmatched && !/^none$/i.test(unmatched),
    simulatedPricing: /^simulated$/i.test(pricingSource),
  };
}

function normalizeAction(action) {
  return String(action || '').trim().toUpperCase();
}

function approvedInstrumentForOrder(order, approvedInstruments) {
  const identifier = String(order?.identifier || order?.conid || order?.ibkrConid || order?.symbol || '').trim();
  const symbol = String(order?.symbol || '').trim().toUpperCase();
  return approvedInstruments.find((instrument) => {
    const ticker = String(instrument.tickerOrIsin || '').trim().toUpperCase();
    const ibkrSymbol = String(instrument.ibkrSymbol || '').trim().toUpperCase();
    const conid = String(instrument.ibkrConid || '').trim();
    return identifier === conid || identifier.toUpperCase() === ticker || symbol === ibkrSymbol || symbol === ticker;
  }) || null;
}

function buildPolicyContext({ portfolioPath, holdingsPath }) {
  const portfolioText = fs.readFileSync(portfolioPath, 'utf8');
  const holdingsText = fs.readFileSync(holdingsPath, 'utf8');
  return {
    portfolioText,
    holdingsText,
    portfolioStatus: parsePortfolioStatus(portfolioText),
    executionMode: parseExecutionMode(portfolioText),
    accountReference: parseBrokerAccountReference(portfolioText),
    requireFirstTradeConfirmation: parseBooleanLine(portfolioText, 'Require confirmation before first live trade'),
    approvedInstruments: readApprovedInstruments(portfolioPath),
    safetyBlockers: evaluateSafetyControls({ portfolioPath, holdingsPath }),
    holdingsHealth: parseHoldingsHealth(holdingsText),
  };
}

async function evaluateExecutionPolicy({ portfolioDir, order, live = false, requireApproval = true }) {
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const context = buildPolicyContext({ portfolioPath, holdingsPath });
  const portfolioName = path.basename(portfolioDir);
  const readiness = await getInteractiveBrokersReadiness({ portfolio: portfolioName });
  const instrument = approvedInstrumentForOrder(order, context.approvedInstruments);
  const errorState = brokerErrorStatus(portfolioName);

  const blockers = [];
  if (!instrument) blockers.push('Requested instrument is not in Approved Instruments.');
  if (context.portfolioStatus !== 'active') blockers.push(`Portfolio status is ${context.portfolioStatus || 'unknown'}, not active.`);
  if (live && context.executionMode === 'propose_only') blockers.push('Execution mode is propose_only; live execution is not allowed.');
  if (live && requireApproval && context.executionMode === 'require_confirmation' && order?.userApproved !== true) {
    blockers.push('Live execution requires explicit user approval flag.');
  }
  if (live && context.requireFirstTradeConfirmation === true && order?.userApproved !== true) {
    blockers.push('Portfolio requires confirmation before first live trade.');
  }
  if (context.holdingsHealth.hasUnmatched) blockers.push(`Holdings contain unmatched instruments: ${context.holdingsHealth.unmatched}`);
  if (context.holdingsHealth.simulatedPricing) blockers.push('Holdings still use simulated pricing.');
  if (live && !readiness.authenticated) blockers.push(`Broker readiness is not healthy: ${readiness.message}`);
  if (live && errorState.stopAutomation) blockers.push(`Broker automation is paused after ${errorState.consecutive} consecutive broker errors.`);
  for (const blocker of context.safetyBlockers) blockers.push(blocker.message);

  return {
    ok: blockers.length === 0,
    live,
    instrument,
    blockers,
    readiness,
    context: {
      portfolioStatus: context.portfolioStatus,
      executionMode: context.executionMode,
      accountReference: context.accountReference,
      holdingsHealth: context.holdingsHealth,
      errorState,
    },
  };
}

function toTradeProposalRow(order, policy, brokerResult) {
  const instrument = policy.instrument;
  const referencePrice = brokerResult?.quote?.referencePrice || order.limitPrice || 0;
  const estimatedValue = brokerResult?.quote?.estimatedValue || (Number(order.quantity || 0) * Number(referencePrice || 0));
  const action = normalizeAction(order.action) === 'SELL' ? 'sell' : normalizeAction(order.action) === 'HOLD' ? 'hold' : 'buy';
  return {
    action,
    status: brokerResult?.dryRun === false ? 'approved' : 'planned',
    instrument: instrument?.tickerOrIsin || order.symbol || order.identifier,
    instrumentName: instrument?.name || order.symbol || 'Unknown instrument',
    quantity: Number(order.quantity || 0),
    limitPrice: Number(order.limitPrice || referencePrice || 0),
    estimatedChf: Number(estimatedValue || 0),
    estimatedOrderChf: Number(estimatedValue || 0),
    allocationBeforePct: order.allocationBeforePct ?? 'n/a',
    allocationTargetPct: instrument?.target ?? order.allocationTargetPct ?? 'n/a',
    allocationAfterPct: order.allocationAfterPct ?? 'n/a',
    driftBefore: order.driftBefore ?? 'n/a',
    driftAfter: order.driftAfter ?? 'n/a',
    driftCorrected: order.driftCorrected ?? 'n/a',
    fundingSource: order.fundingSource || 'available_cash',
    blocked: false,
    rationale: brokerResult?.dryRun === false
      ? 'Portfolio-approved staged broker order prepared but not transmitted.'
      : 'Portfolio-approved dry-run broker order preview generated.',
    riskNote: brokerResult?.dryRun === false
      ? 'Non-transmitted broker staging only; requires explicit follow-up before any live transmission.'
      : 'Dry-run only; no broker write attempted.',
  };
}

function hasConflictingOpenTrade(tradesPath, order) {
  if (!fs.existsSync(tradesPath)) return false;
  const text = fs.readFileSync(tradesPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const targetIds = new Set([
    String(order?.identifier || '').trim().toUpperCase(),
    String(order?.conid || '').trim().toUpperCase(),
    String(order?.ibkrConid || '').trim().toUpperCase(),
    String(order?.symbol || '').trim().toUpperCase(),
  ].filter(Boolean));
  if (!targetIds.size) return false;

  for (const line of lines) {
    if (!line.startsWith('| ') || line.includes('|---|') || line.includes('| Date/time |')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const status = String(cells[1] || '').toLowerCase();
    if (!['approved', 'submitted', 'partially_filled'].includes(status)) continue;
    const ticker = String(cells[3] || '').trim().toUpperCase();
    if (targetIds.has(ticker)) return true;
  }

  return false;
}

async function stagePortfolioOrder({ portfolioDir, order, dryRun = true, revocableOnly = true }) {
  const policy = await evaluateExecutionPolicy({ portfolioDir, order, live: !dryRun, requireApproval: true });
  if (!policy.ok) {
    return {
      ok: false,
      reason: 'policy_blocked',
      blockers: policy.blockers,
      policy,
    };
  }

  const tradesPath = path.join(portfolioDir, 'trades.md');
  if (hasConflictingOpenTrade(tradesPath, order)) {
    return {
      ok: false,
      reason: 'duplicate_submission_blocked',
      blockers: ['Existing approved or in-flight trade for this instrument must be reconciled before staging a new order.'],
      policy,
    };
  }

  const client = new InteractiveBrokersClient({ portfolio: path.basename(portfolioDir) });
  const brokerResult = await client.placeOrder(order, { dryRun, revocableOnly });
  if (!brokerResult.ok) {
    const errorState = recordBrokerError({
      portfolio: path.basename(portfolioDir),
      reason: brokerResult.reason || 'broker_error',
      message: brokerResult.error || brokerResult.message || 'Broker order staging failed.',
    });
    return {
      ok: false,
      reason: brokerResult.reason || 'broker_error',
      error: brokerResult.error || brokerResult.message || 'Broker order staging failed.',
      policy,
      brokerResult,
      errorState,
    };
  }
  clearBrokerErrors(path.basename(portfolioDir));

  const historyPath = path.join(portfolioDir, 'history.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const tradeProposal = toTradeProposalRow(order, policy, brokerResult);
  const tradeAppend = appendTradeProposals(tradesPath, [tradeProposal]);
  const historyAppend = appendHistorySnapshot(
    historyPath,
    holdingsPath,
    dryRun ? 'end_of_day' : 'execution_staged',
    dryRun ? 'Dry-run broker order preview generated.' : 'Non-transmitted broker order staged.'
  );
  const dashboardPath = await regenerateDashboard(portfolioDir);

  return {
    ok: true,
    dryRun,
    policy,
    brokerResult,
    tradeAppend,
    historyAppend,
    dashboardPath,
  };
}

async function approvePortfolioTrade({ portfolioDir, selector, approval = 'user_approved' }) {
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const historyPath = path.join(portfolioDir, 'history.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const result = markTradeApproved(tradesPath, selector, approval);
  let historyAppend = null;
  if (result.updated > 0) {
    historyAppend = appendHistorySnapshot(historyPath, holdingsPath, 'execution_approved', 'Trade approved for broker execution.', { executionStatus: 'approved' });
    await regenerateDashboard(portfolioDir);
  }
  return { ok: result.updated > 0, historyAppend, ...result };
}

async function syncPortfolioOrderStatus({ portfolioDir, orderId, selector = {}, reasonNote = '', refreshHoldingsOnFill = true }) {
  const portfolioName = path.basename(portfolioDir);
  const client = new InteractiveBrokersClient({ portfolio: portfolioName });
  const statusResult = await client.getOrderStatus(orderId);
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const historyPath = path.join(portfolioDir, 'history.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');

  if (!statusResult.ok) {
    const knownMissing = statusResult.reason === 'not_found';
    const errorState = knownMissing
      ? null
      : recordBrokerError({
          portfolio: portfolioName,
          reason: statusResult.reason || 'status_error',
          message: statusResult.error || statusResult.message || 'Unable to fetch broker order status.',
        });

    if (knownMissing) {
      const reconcile = reconcileOrderStatus(
        tradesPath,
        { ...selector, orderId },
        { orderId, status: 'not_found', notFound: true },
        { reasonNote: reasonNote || 'Broker order status lookup returned not_found.' }
      );
      if (reconcile.updated > 0) {
        appendHistorySnapshot(historyPath, holdingsPath, 'execution_status', `Broker order ${orderId} status sync: not_found`, { executionStatus: 'not_found' });
        await regenerateDashboard(portfolioDir);
      }
      return {
        ok: reconcile.updated > 0,
        reason: 'not_found',
        statusResult,
        reconcile,
      };
    }

    return {
      ok: false,
      reason: statusResult.reason || 'status_error',
      error: statusResult.error || statusResult.message || 'Unable to fetch broker order status.',
      statusResult,
      errorState,
    };
  }

  clearBrokerErrors(portfolioName);
  const reconcile = reconcileOrderStatus(tradesPath, { ...selector, orderId }, statusResult.order, { reasonNote });
  let holdingsSync = null;
  const mappedStatus = statusResult.order.status || 'submitted';
  if (reconcile.updated > 0) {
    const lowered = String(mappedStatus).toLowerCase();
    if (refreshHoldingsOnFill && ['filled', 'partially_filled'].includes(lowered)) {
      holdingsSync = await syncInteractiveBrokersHoldings({ portfolioDir });
      if (!holdingsSync.ok) {
        recordBrokerError({
          portfolio: portfolioName,
          reason: holdingsSync.reason || holdingsSync.auth?.reason || 'holdings_sync_error',
          message: holdingsSync.auth?.error || holdingsSync.reason || 'Holdings sync failed after fill reconciliation.',
        });
      } else {
        clearBrokerErrors(portfolioName);
      }
    }
    appendHistorySnapshot(historyPath, holdingsPath, 'execution_status', `Broker order ${orderId} status sync: ${mappedStatus}`, { executionStatus: lowered });
    await regenerateDashboard(portfolioDir);
  }

  return {
    ok: reconcile.updated > 0,
    statusResult,
    reconcile,
    holdingsSync,
  };
}

async function cancelPortfolioOrder({ portfolioDir, orderId, selector = {}, userApproved = false }) {
  if (!userApproved) {
    return {
      ok: false,
      reason: 'policy_blocked',
      blockers: ['Order cancellation requires explicit user approval flag.'],
      policy: null,
    };
  }

  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const context = buildPolicyContext({ portfolioPath, holdingsPath });
  const readiness = await getInteractiveBrokersReadiness({ portfolio: path.basename(portfolioDir) });
  const blockers = [];
  if (context.portfolioStatus !== 'active') blockers.push(`Portfolio status is ${context.portfolioStatus || 'unknown'}, not active.`);
  if (!readiness.authenticated) blockers.push(`Broker readiness is not healthy: ${readiness.message}`);
  for (const blocker of context.safetyBlockers) blockers.push(blocker.message);
  if (blockers.length > 0) {
    return {
      ok: false,
      reason: 'policy_blocked',
      blockers,
      policy: {
        ok: false,
        live: true,
        instrument: null,
        blockers,
        readiness,
        context: {
          portfolioStatus: context.portfolioStatus,
          executionMode: context.executionMode,
          accountReference: context.accountReference,
          holdingsHealth: context.holdingsHealth,
        },
      },
    };
  }

  const client = new InteractiveBrokersClient({ portfolio: path.basename(portfolioDir) });
  const cancelResult = await client.cancelOrder(orderId);
  if (!cancelResult.ok) {
    return {
      ok: false,
      reason: cancelResult.reason || 'cancel_error',
      error: cancelResult.error || cancelResult.message || 'Unable to cancel broker order.',
      cancelResult,
    };
  }

  const tradesPath = path.join(portfolioDir, 'trades.md');
  const historyPath = path.join(portfolioDir, 'history.md');
  const cancelStatus = cancelResult.cancel?.status || 'cancelled';
  const reconcile = reconcileOrderStatus(tradesPath, { ...selector, orderId }, { orderId, status: cancelStatus }, { reasonNote: cancelResult.cancel?.message || 'Broker cancel requested.' });
  if (reconcile.updated === 0) {
    appendTradeEvent(tradesPath, {
      status: 'cancelled',
      action: selector.action || '',
      tickerOrIsin: selector.tickerOrIsin || '',
      name: selector.name || '',
      reason: cancelResult.cancel?.message || 'Broker cancel requested.',
      approval: 'cancelled',
      brokerOrderId: String(orderId),
    });
  }
  appendHistorySnapshot(historyPath, holdingsPath, 'execution_status', `Broker order ${orderId} cancel result: ${cancelStatus}`, { executionStatus: cancelStatus });
  await regenerateDashboard(portfolioDir);

  return {
    ok: true,
    cancelResult,
    reconcile,
  };
}

module.exports = {
  parsePortfolioStatus,
  parseExecutionMode,
  parseBrokerAccountReference,
  parseHoldingsHealth,
  evaluateExecutionPolicy,
  stagePortfolioOrder,
  approvePortfolioTrade,
  syncPortfolioOrderStatus,
  cancelPortfolioOrder,
};
