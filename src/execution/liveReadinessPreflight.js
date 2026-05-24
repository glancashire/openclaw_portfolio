'use strict';

const fs = require('fs');
const path = require('path');
const { getInteractiveBrokersReadiness } = require('../brokers/interactive-brokers/readiness');
const { parseExecutionMode, parsePortfolioStatus } = require('./portfolioExecution');
const { readTradesTable, listExecutableTradeRows, classifyExecutableRow } = require('./tradeState');
const { listApprovalEnvelopes } = require('./basketApprovalStore');
const { brokerErrorStatus, readExecutionState, writeExecutionState } = require('./runtimeState');
const { parseTradeDate, hoursBetween } = require('./executionClassification');
const { isMarketOpen, nextOpenTime } = require('../../lib/marketHours');
const { readMarketCalendarArtifact } = require('./marketCalendarStore');
const { parseHoursSegments, evaluateHoursState } = require('./marketCalendar');
const { buildExecutableOrderDiagnostics } = require('./executionDiagnostics');

const DEFAULT_APPROVAL_MAX_AGE_HOURS = 24;
const DEFAULT_ARM_WINDOW_HOURS = 24;

function readPortfolioBasics(portfolioDir) {
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const text = fs.readFileSync(portfolioPath, 'utf8');
  return {
    portfolioPath,
    portfolioText: text,
    portfolioStatus: parsePortfolioStatus(text),
    executionMode: parseExecutionMode(text),
  };
}

function executionStateKey(portfolioDir) {
  return path.basename(portfolioDir);
}

function getLiveArmState(portfolioDir) {
  const state = readExecutionState();
  const key = executionStateKey(portfolioDir);
  const armed = state.liveExecutionArms?.[key] || null;
  if (!armed) return { armedForMarketOpen: false, armExpiresAt: null, armReason: 'not_armed' };
  const expiresAt = armed.expiresAt || null;
  const expired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : true;
  if (expired) {
    return { armedForMarketOpen: false, armExpiresAt: expiresAt, armReason: 'expired' };
  }
  return {
    armedForMarketOpen: true,
    armExpiresAt: expiresAt,
    armedAt: armed.armedAt || null,
    armReason: 'armed',
    note: armed.note || null,
  };
}

function armLiveExecutionWindow(portfolioDir, { expiresAt, note = '' } = {}) {
  const state = readExecutionState();
  const key = executionStateKey(portfolioDir);
  state.liveExecutionArms ||= {};
  const armedAt = new Date().toISOString();
  const computedExpiresAt = expiresAt || new Date(Date.now() + DEFAULT_ARM_WINDOW_HOURS * 36e5).toISOString();
  state.liveExecutionArms[key] = { armedAt, expiresAt: computedExpiresAt, note };
  writeExecutionState(state);
  return state.liveExecutionArms[key];
}

function clearLiveExecutionArm(portfolioDir) {
  const state = readExecutionState();
  const key = executionStateKey(portfolioDir);
  state.liveExecutionArms ||= {};
  delete state.liveExecutionArms[key];
  writeExecutionState(state);
  return { ok: true };
}

function summarizeBasketApprovalState({ portfolioDir = null, repoRoot = process.cwd(), now = new Date(), maxAgeHours = DEFAULT_APPROVAL_MAX_AGE_HOURS } = {}) {
  const portfolio = portfolioDir ? path.basename(portfolioDir) : null;
  const envelopes = portfolio ? listApprovalEnvelopes({ portfolio, rootDir: repoRoot, now, includeExpired: true }) : [];
  const approved = envelopes.filter((item) => item.ok && !item.expired);
  const executable = approved.filter((item) => (item.envelope?.legs || []).every((leg) => String(leg.status || 'approved').trim().toLowerCase() === 'approved'));
  return {
    approvedCount: approved.length,
    executableCount: executable.length,
    hasApprovedBasket: approved.length > 0,
    hasExecutableApprovedBasket: executable.length > 0,
    executableBaskets: executable.map((item) => ({ approvalId: item.approvalId, path: item.path })),
    latestApprovedAt: approved[0]?.envelope?.createdAt || null,
    approvedBaskets: approved.map((item) => ({ approvalId: item.approvalId, path: item.path })),
  };
}

function summarizeApprovalState(tradesPath, now = new Date(), maxAgeHours = DEFAULT_APPROVAL_MAX_AGE_HOURS, { portfolioDir = null, repoRoot = process.cwd() } = {}) {
  const table = readTradesTable(tradesPath);
  const basketState = summarizeBasketApprovalState({ portfolioDir, repoRoot, now, maxAgeHours });
  const rows = table.rows;
  const proposedRows = rows.filter((row) => String(row.Status || '').trim().toLowerCase() === 'proposed');
  const approvedRows = rows.filter((row) => String(row.Status || '').trim().toLowerCase() === 'approved');
  const executableRows = listExecutableTradeRows(tradesPath, { now, maxApprovalAgeHours: maxAgeHours });
  const enrichedExecutableRows = executableRows.map((row) => {
    const match = rows.find((candidate) => `${candidate['Date/time']}::${candidate['Ticker / ISIN']}::${String(candidate.Action || '').toLowerCase()}` === `${row.dateTime}::${row.tickerOrIsin}::${String(row.action || '').toLowerCase()}`);
    return {
      ...row,
      blockCode: match?.['Block code'] || '',
      blockReason: match?.['Block reason'] || '',
      nextAction: match?.['Next action'] || '',
    };
  });
  const executableKeys = new Set(executableRows.map((row) => `${row.dateTime}::${row.tickerOrIsin}::${String(row.action || '').toLowerCase()}`));
  const excludedApprovedRows = approvedRows
    .filter((row) => !executableKeys.has(`${row['Date/time']}::${row['Ticker / ISIN']}::${String(row.Action || '').toLowerCase()}`))
    .map((row) => {
      const classification = classifyExecutableRow(row, { now, maxApprovalAgeHours: maxAgeHours });
      return {
        dateTime: row['Date/time'],
        status: row.Status,
        action: row.Action,
        tickerOrIsin: row['Ticker / ISIN'],
        name: row.Name,
        quantity: Number(row.Quantity || 0),
        limitPrice: Number(row['Limit price'] || 0),
        estimatedChf: Number(row['Estimated CHF'] || 0),
        approval: row.Approval,
        brokerOrderId: row['Broker order id'],
        reason: row.Reason,
        blockCode: row['Block code'] || classification.reasonCode || '',
        blockReason: row['Block reason'] || classification.reason || inferExcludedApprovedReason(row),
        nextAction: row['Next action'] || classification.nextAction || '',
        exclusionReasonCode: classification.reasonCode || '',
        canonicalState: classification.canonicalState || '',
        staleApproval: Boolean(classification.staleApproval),
        approvalAgeHours: classification.approvalAgeHours,
      };
    });
  const staleApprovedRows = approvedRows.filter((row) => classifyExecutableRow(row, { now, maxApprovalAgeHours: maxAgeHours }).staleApproval);
  const latestApprovedAt = approvedRows
    .map((row) => parseTradeDate(row['Date/time']))
    .filter(Boolean)
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
  const approvalAgeHours = hoursBetween(latestApprovedAt, now);
  const staleApproval = approvedRows.length > 0 && approvalAgeHours != null && approvalAgeHours > maxAgeHours;
  const ambiguousQueuedRows = rows.filter((row) => {
    const approval = String(row.Approval || '').trim();
    const status = String(row.Status || '').trim().toLowerCase();
    const orderId = String(row['Broker order id'] || '').trim();
    return ['queued_for_open_runner', 'submitted_to_open_runner', 'ready_for_submission', 'user_approved'].includes(approval)
      && ['proposed', 'planned'].includes(status)
      && !orderId;
  });

  return {
    basketApprovalState: basketState,
    proposedCount: proposedRows.length,
    approvedCount: approvedRows.length,
    basketApprovedCount: basketState.approvedCount,
    basketExecutableCount: basketState.executableCount,
    hasApprovedBasket: basketState.hasApprovedBasket,
    hasExecutableApprovedBasket: basketState.hasExecutableApprovedBasket,
    executableCount: executableRows.length,
    latestApprovedAt: latestApprovedAt ? latestApprovedAt.toISOString() : null,
    approvalAgeHours: approvalAgeHours == null ? null : Number(approvalAgeHours.toFixed(2)),
    staleApproval,
    staleApprovedRows: staleApprovedRows.map((row) => ({
      dateTime: row['Date/time'],
      tickerOrIsin: row['Ticker / ISIN'],
      action: row.Action,
      approval: row.Approval,
    })),
    maxApprovalAgeHours: maxAgeHours,
    ambiguousQueuedCount: ambiguousQueuedRows.length,
    hasAnyApprovedRows: approvedRows.length > 0,
    hasExecutableApprovedRows: executableRows.length > 0,
    executableRows: enrichedExecutableRows,
    excludedApprovedRows,
  };
}

function inferExcludedApprovedReason(row) {
  const classification = classifyExecutableRow(row);
  if (classification?.reason) return classification.reason;
  const blockReason = String(row['Block reason'] || '').trim();
  if (blockReason) return blockReason;
  const blockCode = String(row['Block code'] || '').trim();
  if (blockCode) return `Blocked by ${blockCode}.`;
  const orderId = String(row['Broker order id'] || '').trim();
  if (orderId) return `Row already has broker order id ${orderId}.`;
  return 'Approved row is not currently executable.';
}

const CALENDAR_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function evaluateMarketWindowFromCalendar(portfolioDir, exchange, now = new Date()) {
  try {
    const repoRoot = path.dirname(path.dirname(portfolioDir));
    const runtimeRoot = path.join(repoRoot, 'runtime');
    const artifact = readMarketCalendarArtifact({ portfolioDir, runtimeRoot });
    if (!artifact || !artifact.generatedAt) return null;

    const generatedMs = new Date(artifact.generatedAt).getTime();
    if (isNaN(generatedMs) || (now.getTime() - generatedMs) > CALENDAR_MAX_AGE_MS) return null;

    const instruments = Array.isArray(artifact.instruments) ? artifact.instruments : [];
    // Find best match: prefer liquidHours for the target exchange
    const matched = instruments.find((row) =>
      row.syncStatus === 'ok' &&
      row.liquidHoursRaw &&
      (row.ibkrPrimaryExchange === exchange || row.exchange === exchange)
    ) || instruments.find((row) =>
      row.syncStatus === 'ok' && row.liquidHoursRaw
    );

    if (!matched || !matched.liquidHoursRaw) return null;

    const segments = parseHoursSegments(matched.liquidHoursRaw);
    const state = evaluateHoursState(segments, now);

    if (state.status === 'unknown') return null; // not definitive
    return {
      open: state.status === 'open',
      reason: `calendar:${state.status}`,
      source: 'calendar_artifact',
      exchange: matched.ibkrPrimaryExchange || matched.exchange || exchange,
      instrument: matched.tickerOrIsin,
    };
  } catch {
    return null;
  }
}

function evaluateMarketWindow(portfolioDir, { contractDetailsByTicker = {}, now = new Date() } = {}) {
  const diagnostics = buildExecutableOrderDiagnostics({ portfolioDir, contractDetailsByTicker, now });
  const primaryExchange = diagnostics[0]?.preparedOrder?.primaryExchange || diagnostics[0]?.approvedInstrument?.ibkrPrimaryExchange || null;
  const exchange = primaryExchange || 'EBS';

  // Try persisted calendar first
  const calendarResult = evaluateMarketWindowFromCalendar(portfolioDir, exchange, now);
  if (calendarResult) {
    return {
      exchange: calendarResult.exchange || exchange,
      openNow: calendarResult.open,
      reason: calendarResult.reason,
      source: calendarResult.source,
      nextOpen: calendarResult.open ? null : nextOpenTime(exchange),
      diagnostics,
    };
  }

  // Fallback to heuristic
  const openNow = isMarketOpen(exchange);
  return {
    exchange,
    openNow: Boolean(openNow.open),
    reason: openNow.reason,
    source: 'heuristic',
    nextOpen: nextOpenTime(exchange),
    diagnostics,
  };
}

function writePreSubmitDiagnosticArtifact({ portfolioDir, portfolio, payload }) {
  const runtimeDir = path.join(path.dirname(path.dirname(portfolioDir)), 'runtime', 'pre-submit-diagnostics');
  fs.mkdirSync(runtimeDir, { recursive: true });
  const outPath = path.join(runtimeDir, `${portfolio}-live-readiness.json`);
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  return outPath;
}

async function evaluateLiveReadinessPreflight({ portfolioDir, now = new Date(), maxApprovalAgeHours = DEFAULT_APPROVAL_MAX_AGE_HOURS, contractDetailsByTicker = {} } = {}) {
  const basics = readPortfolioBasics(portfolioDir);
  const portfolio = path.basename(portfolioDir);
  const tradesPath = path.join(portfolioDir, 'trades.md');
  const brokerReadiness = await getInteractiveBrokersReadiness({ portfolio });
  const approvalState = summarizeApprovalState(tradesPath, now, maxApprovalAgeHours, { portfolioDir, repoRoot: path.dirname(path.dirname(portfolioDir)) });
  const armState = getLiveArmState(portfolioDir);
  const marketWindow = evaluateMarketWindow(portfolioDir, { contractDetailsByTicker, now });
  const errorState = brokerErrorStatus(portfolio);

  const blockers = [];
  const warnings = [];

  if (basics.portfolioStatus !== 'active') {
    blockers.push({ code: 'portfolio_inactive', message: `Portfolio status is ${basics.portfolioStatus || 'unknown'}, not active.` });
  }
  if (basics.executionMode !== 'transmitted_live') {
    blockers.push({ code: 'execution_mode_not_live', message: `Execution mode is ${basics.executionMode || 'unknown'}, not transmitted_live.` });
  }
  if (!armState.armedForMarketOpen) {
    blockers.push({ code: 'not_armed_for_market_open', message: 'Live execution is not armed for the next market-open window.' });
  }
  if (!brokerReadiness.authenticated || brokerReadiness.fallbackRequired) {
    blockers.push({ code: 'broker_unready', message: `Broker readiness is not healthy: ${brokerReadiness.message}` });
  }
  if (!approvalState.hasAnyApprovedRows && !approvalState.hasExecutableApprovedBasket) {
    blockers.push({ code: 'no_approved_rows', message: 'No approved trade rows or approved basket exist for live execution.' });
  }
  if (!approvalState.hasExecutableApprovedRows && !approvalState.hasExecutableApprovedBasket) {
    blockers.push({ code: 'no_executable_rows', message: 'No executable approved trade rows or approved basket are currently eligible for submission.' });
  }
  if (approvalState.excludedApprovedRows.length > 0) {
    const sample = approvalState.excludedApprovedRows[0];
    warnings.push({
      code: 'excluded_approved_rows',
      message: `${approvalState.excludedApprovedRows.length} approved row(s) are currently excluded from execution; inspect approvalState.excludedApprovedRows for reasons.${sample?.tickerOrIsin ? ` Example: ${sample.tickerOrIsin} (${sample.exclusionReasonCode || sample.blockCode || 'excluded'})` : ''}`,
    });
  }
  if (approvalState.staleApproval) {
    blockers.push({ code: 'stale_approval', message: `Latest approval is stale at ${approvalState.approvalAgeHours}h; max allowed is ${approvalState.maxApprovalAgeHours}h.` });
  }
  if (approvalState.proposedCount > 0 && approvalState.approvedCount === 0 && !approvalState.hasExecutableApprovedBasket) {
    blockers.push({ code: 'approval_state_mismatch', message: 'Trades remain proposed with no approved rows recorded, so approval intent is not reflected in the active trade log.' });
  }
  if (approvalState.ambiguousQueuedCount > 0) {
    warnings.push({ code: 'ambiguous_queue_rows', message: `${approvalState.ambiguousQueuedCount} queued/ready row(s) still have proposed/planned status and should be normalized before live execution.` });
  }
  if (errorState.stopAutomation) {
    blockers.push({ code: 'automation_paused', message: `Automation is paused after ${errorState.consecutive} consecutive broker errors.` });
  }
  if (!marketWindow.openNow) {
    warnings.push({ code: 'market_closed', message: `Market is currently closed (${marketWindow.reason}). Next open: ${marketWindow.nextOpen}` });
  }

  for (const diag of marketWindow.diagnostics || []) {
    const liquid = diag?.hours?.liquid || { status: 'unknown', sourceKind: 'unknown' };
    if (['before_open', 'after_close', 'closed', 'unknown'].includes(liquid.status)) {
      const venue = diag?.preparedOrder?.primaryExchange || diag?.approvedInstrument?.ibkrPrimaryExchange || marketWindow.exchange;
      const instrumentLabel = diag?.preparedOrder?.symbol || diag?.tickerOrIsin || 'instrument';
      warnings.push({
        code: 'venue_hours_attention',
        message: `${instrumentLabel} on ${venue} is ${liquid.status.replace(/_/g, ' ')} based on ${liquid.sourceKind === 'ibkr_contract' ? 'IBKR contract hours' : 'local venue reference'}${diag?.tickerOrIsin ? ` (${diag.tickerOrIsin})` : ''}.`,
      });
    }
  }

  const ok = blockers.length === 0;
  const recommendedNextAction = ok
    ? 'Preflight passed. Confirm the submission path intentionally and reconcile promptly after transmission.'
    : blockers[0]?.code === 'approval_state_mismatch'
      ? 'Record approvals in trades.md first, then rerun preflight.'
      : blockers[0]?.code === 'broker_unready'
        ? 'Restore IBKR readiness and rerun preflight.'
        : blockers[0]?.code === 'execution_mode_not_live'
          ? 'Do not transmit. Keep confirmation-first posture unless you explicitly switch execution mode.'
          : blockers[0]?.code === 'not_armed_for_market_open'
            ? 'Arm live execution explicitly for the next intended market-open window, then rerun preflight.'
            : 'Resolve blockers and rerun preflight.';

  const result = {
    ok,
    portfolio,
    generatedAt: now.toISOString(),
    executionMode: basics.executionMode,
    armedForMarketOpen: armState.armedForMarketOpen,
    armExpiresAt: armState.armExpiresAt || null,
    brokerReadiness,
    marketWindow,
    approvalState,
    rows: approvalState.executableRows,
    excludedRows: approvalState.excludedApprovedRows,
    blockers,
    warnings,
    recommendedNextAction,
  };

  result.diagnosticArtifactPath = writePreSubmitDiagnosticArtifact({ portfolioDir, portfolio, payload: result });
  return result;
}

module.exports = {
  DEFAULT_APPROVAL_MAX_AGE_HOURS,
  DEFAULT_ARM_WINDOW_HOURS,
  parseTradeDate,
  summarizeApprovalState,
  evaluateMarketWindow,
  evaluateLiveReadinessPreflight,
  getLiveArmState,
  armLiveExecutionWindow,
  clearLiveExecutionArm,
};
