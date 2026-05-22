#!/usr/bin/env node
'use strict';

/*
 * Phase 187 — End-to-end basket execution with one operator approval.
 * Saves approval envelope, transmits via canonical basket runner, monitors
 * each leg, cancels unfilled legs after timeout, emails per fill, and
 * resyncs holdings. A single failing leg does not stop the basket.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PORTFOLIO_DIR = path.join(ROOT, 'portfolio', 'etf');

const { saveApprovalEnvelope } = require(path.join(ROOT, 'src/execution/basketApprovalStore'));
const { executeApprovedBasket, reconcileBasketRunFromBroker, runPath } = require(path.join(ROOT, 'src/execution/basketExecutionRunner'));
const { mirrorBasketRunToTrades } = require(path.join(ROOT, 'src/execution/basketTradesMirror'));
const { buildReproposalForCancelledLegs } = require(path.join(ROOT, 'src/execution/basketReproposalBuilder'));
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));
const { notifyTradeFill } = require(path.join(ROOT, 'lib/tradeExecutionNotifier'));

const CYCLE_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 30 * 1000;
const IBKR_CLI = path.join(ROOT, 'skills/ibkr/scripts/ibkr_cli.py');

function ibkrJson(args) {
  try {
    const out = execSync(`python3 ${IBKR_CLI} ${args} --json`, { encoding: 'utf8', timeout: 30000 });
    return JSON.parse(out.trim());
  } catch (error) {
    console.error(`[ibkr-cli] ${args} failed: ${error.message}`);
    return null;
  }
}

function nowStamp() {
  return new Date().toISOString().replace(/[-:]|\.\d+/g, '').slice(0, 13);
}

const NEW_BASKET = {
  schemaVersion: '1.0',
  approvalId: `basket-etf-${nowStamp()}`,
  portfolio: 'etf',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  executionPolicy: {
    continueOnIndependentFailure: true,
    requireCompactReapprovalOnPriceDrift: true,
    substitutionAllowed: false,
  },
  legs: [
    { legId: 'leg-1', instrument: 'IE00B5BMR087', ibkrSymbol: 'SXR8',   conid: '75776072',  action: 'BUY', quantity: 16, limitPrice: 692.50, currency: 'EUR', exchange: 'SMART', primaryExchange: 'IBIS2', maxAttempts: 1, retryPolicy: 'none', allowSubstitution: false, status: 'approved' },
    { legId: 'leg-2', instrument: 'LU0950668870', ibkrSymbol: 'EMUAA',  conid: '243939970', action: 'BUY', quantity: 6,  limitPrice: 40.85,  currency: 'EUR', exchange: 'SMART', primaryExchange: null,    maxAttempts: 1, retryPolicy: 'none', allowSubstitution: false, status: 'approved' },
    { legId: 'leg-3', instrument: 'CH0032912732', ibkrSymbol: 'UBSSLI', conid: '150029461', action: 'BUY', quantity: 7,  limitPrice: 162.50, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS',   maxAttempts: 1, retryPolicy: 'none', allowSubstitution: false, status: 'approved' },
    { legId: 'leg-4', instrument: 'CH0130595124', ibkrSymbol: 'SPMCHA', conid: '91639399',  action: 'BUY', quantity: 19, limitPrice: 129.00, currency: 'CHF', exchange: 'SMART', primaryExchange: 'EBS',   maxAttempts: 1, retryPolicy: 'none', allowSubstitution: false, status: 'approved' },
  ],
  summary: 'Operator-approved rebalance basket with refreshed live quotes.',
  source: 'operator_approved',
};

async function main() {
  console.log('=== Phase 187+ basket execution / reconcile ===');
  const args = process.argv.slice(2);
  const reconcileOnly = args.includes('--reconcile-only');
  const approvalIdArg = (args.find((a) => a.startsWith('--approval-id=')) || '').split('=')[1] || null;
  const approvalId = approvalIdArg || NEW_BASKET.approvalId;
  console.log(`mode: ${reconcileOnly ? 'reconcile-only' : 'transmit+monitor+reconcile'}`);
  console.log(`approval id: ${approvalId}`);

  let runResult;
  if (!reconcileOnly) {
    saveApprovalEnvelope({ ...NEW_BASKET, approvalId }, { rootDir: ROOT });
    console.log('Saved approval envelope.');

    console.log('Transmitting basket via canonical runner...');
    try {
      runResult = await executeApprovedBasket({
        portfolioDir: PORTFOLIO_DIR,
        approvalId,
        rootDir: ROOT,
      });
    } catch (error) {
      console.error(`Runner threw: ${error.message}`);
      console.error(error.stack);
      process.exit(2);
    }
    console.log('Runner summary:', JSON.stringify(runResult.runState.summary));
  } else {
    // load existing run state if reconciling
    const statePath = runPath({ portfolio: 'etf', approvalId, rootDir: ROOT });
    if (!fs.existsSync(statePath)) {
      console.error(`No existing runs artifact at ${statePath}`);
      process.exit(2);
    }
    runResult = { path: statePath, runState: JSON.parse(fs.readFileSync(statePath, 'utf8')) };
    console.log('Loaded existing runs artifact:', JSON.stringify(runResult.runState.summary));
  }

  for (const [id, leg] of Object.entries(runResult.runState.legs)) {
    console.log(`  ${id} ${leg.instrument}: status=${leg.status} brokerOrderId=${leg.brokerOrderId || '-'}`);
  }

  const brokerOrderIds = Object.values(runResult.runState.legs)
    .map((leg) => leg.brokerOrderId)
    .filter((id) => Number.isFinite(Number(id)))
    .map((id) => Number(id));

  if (!reconcileOnly && brokerOrderIds.length === 0) {
    console.log('No live orders transmitted. Aborting.');
    process.exit(1);
  }

  const client = new InteractiveBrokersClient({ portfolio: 'etf' });

  if (!reconcileOnly) {
    const stillOpen = new Set(brokerOrderIds);
    const startMs = Date.now();
    // Small settling delay so the open-orders feed has time to register.
    await new Promise((r) => setTimeout(r, 5000));

    while (Date.now() - startMs < CYCLE_TIMEOUT_MS && stillOpen.size > 0) {
      const elapsed = Math.round((Date.now() - startMs) / 1000);
      let open;
      try { open = await client.native.fetchOpenOrders(); } catch (error) {
        console.error(`[${elapsed}s] fetchOpenOrders error: ${error.message}`);
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }
      const openIds = new Set((open || []).map((o) => Number(o.orderId)));
      for (const id of [...stillOpen]) {
        if (!openIds.has(id)) { console.log(`[${elapsed}s] order ${id} no longer open`); stillOpen.delete(id); }
      }
      if (stillOpen.size === 0) break;
      console.log(`[${elapsed}s] still open: ${[...stillOpen].join(', ')}`);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    if (stillOpen.size > 0) {
      console.log(`Timeout reached. Cancelling ${stillOpen.size} unfilled orders...`);
      for (const id of stillOpen) {
        try {
          const r = await client.cancelOrder(Number(id));
          console.log(`Cancelled ${id}: ${JSON.stringify(r?.cancel || r)}`);
        } catch (error) { console.error(`Cancel ${id} failed: ${error.message}`); }
      }
    }
  }

  // Reconcile against broker evidence
  console.log('Fetching broker evidence for reconciliation...');
  const executions = ibkrJson('executions') || [];
  const completedOrders = ibkrJson('completed-orders') || [];
  const reconciledPath = reconcileBasketRunFromBroker({
    portfolio: 'etf',
    approvalId,
    rootDir: ROOT,
    executions,
    completedOrders,
  });
  const reconciled = JSON.parse(fs.readFileSync(reconciledPath, 'utf8'));
  console.log('Reconciled summary:', JSON.stringify(reconciled.summary));

  // Mirror to trades.md (idempotent). Notifications gated on newly mirrored legs to avoid duplicate emails.
  const mirror = mirrorBasketRunToTrades({ portfolioDir: PORTFOLIO_DIR, runState: reconciled });
  console.log(`Trade log mirror: appended=${mirror.appended} skipped=${mirror.skipped ? mirror.skipped.length : 0}`);

  // Notify fills (basket-mode order ids only, and only for legs that were newly mirrored in this run)
  const newlyMirroredOrderIds = new Set((mirror.mirrored || []).filter((m) => m.status === 'filled').map((m) => String(m.brokerOrderId)));
  const orderIdSet = new Set(brokerOrderIds.map(String));
  const myExecs = executions.filter((e) => orderIdSet.has(String(e.orderId)) && newlyMirroredOrderIds.has(String(e.orderId)));
  console.log(`Executions to notify: ${myExecs.length} (newly mirrored only; skipping ${executions.filter((e) => orderIdSet.has(String(e.orderId))).length - myExecs.length} already-notified)`);
  for (const exec of myExecs) {
    const trade = {
      symbol: exec.symbol || exec.contract?.symbol || '?',
      action: exec.side || exec.action || 'BUY',
      qty: Number(exec.shares || exec.quantity || 0),
      fillQty: Number(exec.shares || exec.quantity || 0),
      fillPrice: Number(exec.price || 0),
      price: Number(exec.price || 0),
      currency: exec.currency || 'CHF',
      costChf: Number(exec.shares || exec.quantity || 0) * Number(exec.price || 0),
    };
    try {
      const r = await notifyTradeFill({ trade, portfolio: { name: 'ETF Portfolio', totalValueChf: 0, cashChf: 0, holdings: [] }, openOrders: [], portfolioDir: PORTFOLIO_DIR });
      console.log(`Notified order ${exec.orderId}: ${JSON.stringify(r)}`);
    } catch (error) { console.error(`Notify ${exec.orderId} failed: ${error.message}`); }
  }

  console.log('Resyncing holdings...');
  try {
    const out = execSync('node scripts/sync-interactive-brokers-holdings.js portfolio/etf', { encoding: 'utf8', timeout: 120000, cwd: ROOT });
    console.log(out);
  } catch (error) { console.error(`Resync failed: ${error.message}`); }

  console.log('=== Final ===');
  console.log(`Approval id: ${approvalId}`);
  console.log(`Runs artifact: ${reconciledPath}`);
  console.log(`Filled legs: ${reconciled.summary.filled || 0} / Cancelled: ${reconciled.summary.cancelled || 0} / Total: ${reconciled.summary.total}`);
  const cancelledLegs = Object.values(reconciled.legs).filter((leg) => leg.status === 'cancelled');
  if (cancelledLegs.length > 0) {
    console.log('Cancelled legs (need reproposal):');
    for (const leg of cancelledLegs) console.log(`  - ${leg.instrument} (${leg.ibkrSymbol || ''}) brokerOrderId=${leg.brokerOrderId}`);

    // Phase 190: build a reproposal envelope
    try {
      const envelopePath = path.join(ROOT, 'runtime', 'approved-order-baskets', 'etf', `${approvalId}.json`);
      const originalEnvelope = JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
      const quoteFn = async (conid) => {
        try {
          const snap = await client.native.fetchMarketSnapshot([Number(conid)]);
          const row = (snap || []).find((s) => Number(s.conid) === Number(conid)) || (snap && snap[0]) || null;
          if (!row) return null;
          return { ask: Number(row.ask), bid: Number(row.bid), last: Number(row.last), lastClose: Number(row.close) };
        } catch (error) {
          return { error: error.message };
        }
      };
      const reproposal = await buildReproposalForCancelledLegs({
        portfolio: 'etf',
        approvalId,
        runState: reconciled,
        originalEnvelope,
        quoteFn,
        rootDir: ROOT,
      });
      if (!reproposal.skipped) {
        console.log(`\nReproposal v${reproposal.version} written to: ${reproposal.path}`);
        for (const leg of reproposal.envelope.legs) {
          console.log(`  Leg ${leg.legId} ${leg.instrument} (${leg.ibkrSymbol || '?'}): ${leg.action} ${leg.quantity} @ ${leg.limitPrice} ${leg.currency} (was ${leg.previousLimit})`);
        }
        console.log('\n>>> Awaiting single new operator approval (`approve`) to transmit reproposal.');
      }
    } catch (error) {
      console.error(`Reproposal build failed: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
