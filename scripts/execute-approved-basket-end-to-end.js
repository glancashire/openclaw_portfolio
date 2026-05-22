#!/usr/bin/env node
'use strict';

/*
 * Phase 187 + 192 + 196 — Execute the latest (or named) basket proposal.
 *
 * Default behavior: pick the most recent proposal envelope under
 * runtime/basket-proposals/<portfolio>/, promote it to an approved basket,
 * and run the canonical basket runner. Then run the standard lifecycle.
 *
 * Reconcile-only mode: re-runs the lifecycle against an existing runs artifact.
 *
 * Flags:
 *   --portfolio=<id>           default: etf
 *   --proposal=<path>          override proposal envelope path
 *   --approval-id=<id>         override approval id (rare; mainly for reconcile-only)
 *   --reconcile-only           skip transmit; just reconcile + mirror + notify
 *   --max-age-minutes=<n>      warn if proposal older than this (default 60)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const { saveApprovalEnvelope } = require(path.join(ROOT, 'src/execution/basketApprovalStore'));
const { executeApprovedBasket } = require(path.join(ROOT, 'src/execution/basketExecutionRunner'));
const { runBasketLifecycle, loadRunState } = require(path.join(ROOT, 'src/execution/basketLifecycle'));
const { latestProposalForPortfolio } = require(path.join(ROOT, 'src/execution/basketProposalGenerator'));
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));

function parseArgs(argv) {
  const args = { portfolio: 'etf' };
  for (const a of argv.slice(2)) {
    if (a === '--reconcile-only') { args.reconcileOnly = true; continue; }
    if (!a.startsWith('--')) continue;
    const [k, v] = a.replace(/^--/, '').split('=');
    args[k] = v === undefined ? true : v;
  }
  return args;
}

function loadProposalEnvelope({ rootDir, portfolio, proposalPath, maxAgeMinutes, logger }) {
  if (proposalPath) {
    if (!fs.existsSync(proposalPath)) throw new Error(`proposal path not found: ${proposalPath}`);
    return { path: proposalPath, envelope: JSON.parse(fs.readFileSync(proposalPath, 'utf8')), mtimeMs: fs.statSync(proposalPath).mtimeMs };
  }
  const latest = latestProposalForPortfolio({ rootDir, portfolio });
  if (!latest) throw new Error(`No proposal envelope found under runtime/basket-proposals/${portfolio}/. Run scripts/propose-basket.js first.`);
  const ageMin = (Date.now() - latest.mtimeMs) / 60000;
  if (Number.isFinite(maxAgeMinutes) && ageMin > maxAgeMinutes) {
    logger(`⚠️  Latest proposal is ${ageMin.toFixed(1)} min old (> ${maxAgeMinutes}); consider running scripts/propose-basket.js to refresh.`);
  }
  return latest;
}

async function main() {
  const args = parseArgs(process.argv);
  const portfolio = args.portfolio || 'etf';
  const portfolioDir = path.join(ROOT, 'portfolio', portfolio);
  const reconcileOnly = Boolean(args.reconcileOnly);
  const maxAgeMinutes = args['max-age-minutes'] ? Number(args['max-age-minutes']) : 60;
  const log = (m) => console.log(m);

  log(`=== basket execution / reconcile (portfolio=${portfolio}) ===`);
  log(`mode: ${reconcileOnly ? 'reconcile-only' : 'transmit+monitor+reconcile'}`);

  let approvalId;
  let runState;

  if (!reconcileOnly) {
    let proposal;
    try {
      proposal = loadProposalEnvelope({ rootDir: ROOT, portfolio, proposalPath: args.proposal || null, maxAgeMinutes, logger: log });
    } catch (error) {
      log(`Cannot load proposal: ${error.message}`);
      process.exit(2);
    }
    log(`Proposal envelope: ${proposal.path} (age ${((Date.now() - proposal.mtimeMs) / 60000).toFixed(1)} min)`);

    // Promote proposal → approved basket
    approvalId = args['approval-id'] || proposal.envelope.approvalId;
    const approvedEnvelope = {
      ...proposal.envelope,
      approvalId,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      promotedFromProposal: proposal.path,
      legs: (proposal.envelope.legs || []).map((leg) => ({ ...leg, status: 'approved' })),
    };
    saveApprovalEnvelope(approvedEnvelope, { rootDir: ROOT });
    log(`Saved approved basket envelope (approvalId=${approvalId}).`);

    log('Transmitting via canonical basket runner...');
    try {
      const runResult = await executeApprovedBasket({ portfolioDir, approvalId, rootDir: ROOT });
      runState = runResult.runState;
      log(`Runner summary: ${JSON.stringify(runState.summary)}`);
    } catch (error) {
      console.error(`Runner threw: ${error.message}`);
      console.error(error.stack);
      process.exit(3);
    }
  } else {
    approvalId = args['approval-id'];
    if (!approvalId) { console.error('--reconcile-only requires --approval-id'); process.exit(1); }
    runState = loadRunState({ portfolio, approvalId, rootDir: ROOT });
    if (!runState) { console.error(`No existing runs artifact for approval id ${approvalId}`); process.exit(2); }
    log(`Loaded existing runs artifact: ${JSON.stringify(runState.summary)}`);
  }

  for (const [id, leg] of Object.entries(runState.legs)) {
    log(`  ${id} ${leg.instrument}: status=${leg.status} brokerOrderId=${leg.brokerOrderId || '-'}`);
  }

  const client = new InteractiveBrokersClient({ portfolio });
  const result = await runBasketLifecycle({
    portfolio,
    approvalId,
    rootDir: ROOT,
    portfolioDir,
    client,
    runState,
    options: { skipMonitor: reconcileOnly },
  });

  log('=== Final ===');
  log(`Approval id: ${approvalId}`);
  log(`Runs artifact: ${result.reconciledPath}`);
  log(`Filled legs: ${result.reconciled.summary.filled || 0} / Cancelled: ${result.reconciled.summary.cancelled || 0} / Total: ${result.reconciled.summary.total}`);
  if (result.reproposal && !result.reproposal.skipped) {
    log(`Reproposal v${result.reproposal.version}: ${result.reproposal.path}`);
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
