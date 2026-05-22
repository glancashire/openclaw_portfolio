#!/usr/bin/env node
'use strict';

/*
 * Phase 187 + Phase 192 — End-to-end basket execution with one operator approval.
 * Now delegates the monitor/reconcile/mirror/notify/reproposal block to
 * src/execution/basketLifecycle.js so behavior cannot drift between
 * fresh-execution and reconcile-only modes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORTFOLIO_DIR = path.join(ROOT, 'portfolio', 'etf');

const { saveApprovalEnvelope } = require(path.join(ROOT, 'src/execution/basketApprovalStore'));
const { executeApprovedBasket } = require(path.join(ROOT, 'src/execution/basketExecutionRunner'));
const { runBasketLifecycle, loadRunState } = require(path.join(ROOT, 'src/execution/basketLifecycle'));
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));

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
  console.log('=== basket execution / reconcile ===');
  const args = process.argv.slice(2);
  const reconcileOnly = args.includes('--reconcile-only');
  const approvalIdArg = (args.find((a) => a.startsWith('--approval-id=')) || '').split('=')[1] || null;
  const approvalId = approvalIdArg || NEW_BASKET.approvalId;
  console.log(`mode: ${reconcileOnly ? 'reconcile-only' : 'transmit+monitor+reconcile'}`);
  console.log(`approval id: ${approvalId}`);

  let runState;
  if (!reconcileOnly) {
    saveApprovalEnvelope({ ...NEW_BASKET, approvalId }, { rootDir: ROOT });
    console.log('Saved approval envelope.');

    console.log('Transmitting basket via canonical runner...');
    try {
      const runResult = await executeApprovedBasket({ portfolioDir: PORTFOLIO_DIR, approvalId, rootDir: ROOT });
      runState = runResult.runState;
      console.log('Runner summary:', JSON.stringify(runState.summary));
    } catch (error) {
      console.error(`Runner threw: ${error.message}`);
      console.error(error.stack);
      process.exit(2);
    }
  } else {
    runState = loadRunState({ portfolio: 'etf', approvalId, rootDir: ROOT });
    if (!runState) {
      console.error(`No existing runs artifact for approval id ${approvalId}`);
      process.exit(2);
    }
    console.log('Loaded existing runs artifact:', JSON.stringify(runState.summary));
  }

  for (const [id, leg] of Object.entries(runState.legs)) {
    console.log(`  ${id} ${leg.instrument}: status=${leg.status} brokerOrderId=${leg.brokerOrderId || '-'}`);
  }

  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  const result = await runBasketLifecycle({
    portfolio: 'etf',
    approvalId,
    rootDir: ROOT,
    portfolioDir: PORTFOLIO_DIR,
    client,
    runState,
    options: { skipMonitor: reconcileOnly },
  });

  console.log('=== Final ===');
  console.log(`Approval id: ${approvalId}`);
  console.log(`Runs artifact: ${result.reconciledPath}`);
  console.log(`Filled legs: ${result.reconciled.summary.filled || 0} / Cancelled: ${result.reconciled.summary.cancelled || 0} / Total: ${result.reconciled.summary.total}`);
  if (result.reproposal && !result.reproposal.skipped) {
    console.log(`Reproposal v${result.reproposal.version}: ${result.reproposal.path}`);
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
