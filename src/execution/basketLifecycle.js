'use strict';

/* Phase 192 — Shared basket lifecycle: monitor → reconcile → mirror → notify → reproposal hook.
 *
 * Used by both `scripts/execute-approved-basket-end-to-end.js` and
 * `scripts/approve-and-execute-reproposal.js` so behavior cannot drift.
 *
 * Dependencies are injected so the helper is unit-testable without a live broker.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEFAULT_CYCLE_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_POLL_INTERVAL_MS = 30 * 1000;
const DEFAULT_SETTLE_DELAY_MS = 5 * 1000;

const { reconcileBasketRunFromBroker, runPath } = require('./basketExecutionRunner');
const { mirrorBasketRunToTrades } = require('./basketTradesMirror');
const { buildReproposalForCancelledLegs } = require('./basketReproposalBuilder');

/**
 * Run the post-execution lifecycle for a basket.
 *
 * @param {object} params
 * @param {string} params.portfolio
 * @param {string} params.approvalId
 * @param {string} params.rootDir
 * @param {string} params.portfolioDir
 * @param {object} params.client - exposes `native.fetchOpenOrders`, `native.fetchMarketSnapshot`, `cancelOrder`
 * @param {object} params.runState - the runner's run state (legs + brokerOrderIds)
 * @param {object} [params.options]
 * @param {boolean} [params.options.skipMonitor=false] - skip monitor/cancel block (reconcile-only mode)
 * @param {number}  [params.options.cycleTimeoutMs]
 * @param {number}  [params.options.pollIntervalMs]
 * @param {number}  [params.options.settleDelayMs]
 * @param {function} [params.options.ibkrJson] - fn(args) returning parsed JSON or null
 * @param {function} [params.options.notifyTradeFill] - fn({trade, portfolio, openOrders, portfolioDir})
 * @param {function} [params.options.resyncHoldings] - fn() that does the resync
 * @param {function} [params.options.logger] - fn(msg)
 */
async function runBasketLifecycle({
  portfolio,
  approvalId,
  rootDir,
  portfolioDir,
  client,
  runState,
  options = {},
}) {
  const log = options.logger || ((msg) => console.log(msg));
  const cycleTimeoutMs = options.cycleTimeoutMs ?? DEFAULT_CYCLE_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const settleDelayMs = options.settleDelayMs ?? DEFAULT_SETTLE_DELAY_MS;
  const ibkrJson = options.ibkrJson || defaultIbkrJson(rootDir);
  const notifyTradeFill = options.notifyTradeFill || require(path.join(rootDir, 'lib/tradeExecutionNotifier')).notifyTradeFill;
  const resyncHoldings = options.resyncHoldings || (() => defaultResyncHoldings(rootDir, portfolio, log));

  const brokerOrderIds = Object.values(runState.legs || {})
    .map((leg) => leg.brokerOrderId)
    .filter((id) => Number.isFinite(Number(id)))
    .map((id) => Number(id));

  if (!options.skipMonitor) {
    if (brokerOrderIds.length === 0) {
      log('No live orders transmitted. Skipping monitor.');
    } else {
      await monitorAndCancel({ client, brokerOrderIds, cycleTimeoutMs, pollIntervalMs, settleDelayMs, log });
    }
  }

  log('Fetching broker evidence for reconciliation...');
  const executions = ibkrJson('executions') || [];
  const completedOrders = ibkrJson('completed-orders') || [];
  const reconciledPath = reconcileBasketRunFromBroker({
    portfolio,
    approvalId,
    rootDir,
    executions,
    completedOrders,
  });
  const reconciled = JSON.parse(fs.readFileSync(reconciledPath, 'utf8'));
  log(`Reconciled summary: ${JSON.stringify(reconciled.summary)}`);

  const mirror = mirrorBasketRunToTrades({ portfolioDir, runState: reconciled });
  log(`Trade log mirror: appended=${mirror.appended} skipped=${mirror.skipped ? mirror.skipped.length : 0}`);

  // Notify ONLY for legs newly mirrored in this run, to keep emails idempotent.
  const newlyMirroredOrderIds = new Set((mirror.mirrored || []).filter((m) => m.status === 'filled').map((m) => String(m.brokerOrderId)));
  const orderIdSet = new Set(brokerOrderIds.map(String));
  const myExecs = executions.filter((e) => orderIdSet.has(String(e.orderId)) && newlyMirroredOrderIds.has(String(e.orderId)));
  log(`Executions to notify: ${myExecs.length} (skipping ${executions.filter((e) => orderIdSet.has(String(e.orderId))).length - myExecs.length} already-notified)`);

  // Build a brokerOrderId -> proposal leg lookup for canonical action / currency.
  // IBKR executions carry side='BOT'/'SLD' (filled buy/sell) and often drop the
  // contract currency, so we cannot trust exec.side/exec.currency directly.
  const proposalLegByOrderId = (() => {
    try {
      const proposalPath = path.join(rootDir, 'runtime', 'basket-proposals', portfolio, `${approvalId}.json`);
      if (!fs.existsSync(proposalPath)) return {};
      const env = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));
      const legsArr = Array.isArray(env.legs) ? env.legs : [];
      const out = {};
      for (const reconLeg of Object.values(reconciled.legs || {})) {
        const proposalLeg = legsArr.find((pl) => pl.legId === reconLeg.legId);
        if (proposalLeg && reconLeg.brokerOrderId != null) {
          out[String(reconLeg.brokerOrderId)] = proposalLeg;
        }
      }
      return out;
    } catch (_) { return {}; }
  })();

  function normalizeExecAction(rawSide, proposalAction) {
    const s = String(rawSide || '').toUpperCase();
    if (s === 'BOT' || s === 'BUY') return 'BUY';
    if (s === 'SLD' || s === 'SELL') return 'SELL';
    // Fall back to the proposal's canonical action when the broker side is ambiguous.
    return String(proposalAction || 'BUY').toUpperCase();
  }

  const notifyResults = [];
  for (const exec of myExecs) {
    const proposalLeg = proposalLegByOrderId[String(exec.orderId)] || null;
    const trade = {
      symbol: exec.symbol || (exec.contract && exec.contract.symbol) || (proposalLeg && proposalLeg.ibkrSymbol) || '?',
      action: normalizeExecAction(exec.side || exec.action, proposalLeg && proposalLeg.action),
      qty: Number(exec.shares || exec.quantity || 0),
      fillQty: Number(exec.shares || exec.quantity || 0),
      fillPrice: Number(exec.price || 0),
      price: Number(exec.price || 0),
      currency: exec.currency || (proposalLeg && proposalLeg.currency) || 'CHF',
      orderId: exec.orderId,
      costChf: Number(exec.shares || exec.quantity || 0) * Number(exec.price || 0),
    };
    // Phase F6 (2026-06-03): investor email is intentionally NOT sent from this
    // lifecycle path. Fill emails are dispatched by `scripts/monitor-fills.js`
    // (cron `portfolio-etf-monitor-fills`, every 15 min during market hours)
    // which has access to a fully-resynced holdings snapshot via
    // `lib/tradeNotificationEmail.js#buildNormalizedTradeContext`. The
    // basket-lifecycle path runs while holdings are still mid-resync and
    // would render an email with stale or zero-value portfolio totals.
    //
    // The `reason` string below is what downstream code/tests inspect to
    // confirm the deferral is by design (not a missed code path or a silent
    // failure). If you change it, update `scripts/test-basket-lifecycle.js`
    // and any cron payload that asserts on it.
    notifyResults.push({
      orderId: exec.orderId,
      ok: true,
      result: { attempted: false, sent: false, reason: 'deferred_to_monitor_fills_cron' },
      trade,
    });
    log(`Fill recorded for order ${exec.orderId} (${trade.symbol} ${trade.action} ${trade.fillQty}@${trade.fillPrice} ${trade.currency}) — investor email handed off to monitor-fills cron`);
  }

  try {
    log('Resyncing holdings...');
    const r = await resyncHoldings();
    if (r) log(typeof r === 'string' ? r : JSON.stringify(r).slice(0, 400));
  } catch (error) {
    log(`Resync failed: ${error.message}`);
  }

  // Reproposal hook for any legs that ended cancelled.
  let reproposal = null;
  const cancelledLegs = Object.values(reconciled.legs).filter((leg) => leg.status === 'cancelled');
  if (cancelledLegs.length > 0) {
    log('Cancelled legs (need reproposal):');
    for (const leg of cancelledLegs) log(`  - ${leg.instrument} (${leg.ibkrSymbol || ''}) brokerOrderId=${leg.brokerOrderId}`);
    try {
      const envelopePath = path.join(rootDir, 'runtime', 'approved-order-baskets', portfolio, `${approvalId}.json`);
      if (!fs.existsSync(envelopePath)) {
        log(`Reproposal skipped: original approval envelope not found at ${envelopePath}`);
      } else {
        const originalEnvelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
        const quoteFn = options.quoteFn || (async (conid) => {
          try {
            const snap = await client.native.fetchMarketSnapshot([Number(conid)]);
            const row = (snap || []).find((s) => Number(s.conid) === Number(conid)) || (snap && snap[0]) || null;
            if (!row) return null;
            return { ask: Number(row.ask), bid: Number(row.bid), last: Number(row.last), lastClose: Number(row.close) };
          } catch (error) { return { error: error.message }; }
        });
        reproposal = await buildReproposalForCancelledLegs({
          portfolio,
          approvalId,
          runState: reconciled,
          originalEnvelope,
          quoteFn,
          rootDir,
        });
        if (reproposal && !reproposal.skipped) {
          log(`Reproposal v${reproposal.version} written to: ${reproposal.path}`);
          for (const leg of reproposal.envelope.legs) {
            log(`  Leg ${leg.legId} ${leg.instrument} (${leg.ibkrSymbol || '?'}): ${leg.action} ${leg.quantity} @ ${leg.limitPrice} ${leg.currency} (was ${leg.previousLimit})`);
          }
          log('>>> Awaiting single new operator approval (`approve`) to transmit reproposal.');
        }
      }
    } catch (error) {
      log(`Reproposal build failed: ${error.message}`);
    }
  }

  return {
    approvalId,
    reconciledPath,
    reconciled,
    mirror,
    notifyResults,
    reproposal,
    cancelledLegCount: cancelledLegs.length,
    brokerOrderIds,
  };
}

async function monitorAndCancel({ client, brokerOrderIds, cycleTimeoutMs, pollIntervalMs, settleDelayMs, log }) {
  const stillOpen = new Set(brokerOrderIds);
  const startMs = Date.now();
  await new Promise((r) => setTimeout(r, settleDelayMs));

  while (Date.now() - startMs < cycleTimeoutMs && stillOpen.size > 0) {
    const elapsed = Math.round((Date.now() - startMs) / 1000);
    let open;
    try {
      open = await client.native.fetchOpenOrders();
    } catch (error) {
      log(`[${elapsed}s] fetchOpenOrders error: ${error.message}`);
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      continue;
    }
    const openIds = new Set((open || []).map((o) => Number(o.orderId)));
    for (const id of [...stillOpen]) {
      if (!openIds.has(id)) { log(`[${elapsed}s] order ${id} no longer open`); stillOpen.delete(id); }
    }
    if (stillOpen.size === 0) break;
    log(`[${elapsed}s] still open: ${[...stillOpen].join(', ')}`);
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  if (stillOpen.size > 0) {
    log(`Timeout reached. Cancelling ${stillOpen.size} unfilled orders...`);
    for (const id of stillOpen) {
      try {
        const r = await client.cancelOrder(Number(id));
        log(`Cancelled ${id}: ${JSON.stringify(r && r.cancel ? r.cancel : r)}`);
      } catch (error) { log(`Cancel ${id} failed: ${error.message}`); }
    }
  }
}

function defaultIbkrJson(rootDir) {
  const cli = path.join(rootDir, 'skills/ibkr/scripts/ibkr_cli.py');
  return function ibkrJson(args) {
    try {
      const out = execSync(`python3 ${cli} ${args} --json`, { encoding: 'utf8', timeout: 30000 });
      return JSON.parse(out.trim());
    } catch (error) {
      console.error(`[ibkr-cli] ${args} failed: ${error.message}`);
      return null;
    }
  };
}

function defaultResyncHoldings(rootDir, portfolio, log) {
  try {
    const out = execSync(`node scripts/sync-interactive-brokers-holdings.js portfolio/${portfolio}`, { encoding: 'utf8', timeout: 120000, cwd: rootDir });
    return out;
  } catch (error) {
    log && log(`Resync subprocess failed: ${error.message}`);
    return null;
  }
}

function loadRunState({ portfolio, approvalId, rootDir }) {
  const statePath = runPath({ portfolio, approvalId, rootDir });
  if (!fs.existsSync(statePath)) return null;
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

module.exports = { runBasketLifecycle, monitorAndCancel, loadRunState };
