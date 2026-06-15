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
const { requireApprovalIntent, consumeApprovalIntent } = require(path.join(ROOT, 'src/execution/approvalGate'));
const { loadWorkspaceEnv } = require(path.join(ROOT, 'src/shared/env'));

// Hydrate process.env from .env so the approval gate can find
// OPENCLAW_APPROVAL_SAFEWORD / OPENCLAW_APPROVAL_PIN even when the runner is
// invoked from a context (cron, manual node call) that doesn't pre-export them.
loadWorkspaceEnv();
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

    try {
      requireApprovalIntent({
        approvalId,
        rootDir: ROOT,
        scriptName: 'execute-approved-basket-end-to-end',
        scope: 'basket-execute',
      });
    } catch (error) {
      console.error(`Approval gate denied (${error.reason || error.code || 'unknown'}): ${error.message}`);
      process.exit(4);
    }

    log('Transmitting via canonical basket runner...');
    let transmitAttempted = false;
    try {
      transmitAttempted = true;
      // Phase L (2026-06-05): wire pre-flight safeguards into the runner.
      // Live quote feeder uses the IBKR client snapshot fields (84=bid, 86=ask, 31=last).
      const guardClient = new InteractiveBrokersClient({ portfolio });
      const fetchLiveQuote = async (conid) => {
        const snap = await guardClient.fetchMarketSnapshot([conid]);
        const d = Array.isArray(snap) ? snap[0] : snap;
        return {
          bid: Number(d?.['84']),
          ask: Number(d?.['86']),
          last: Number(d?.['31']),
          // 7295 = prior close (used by L1.D BUY trend guard)
          prevClose: Number(d?.['7295']),
        };
      };
      // Trust the envelope's per-leg fxToChf (set at proposal time). Defaults to 1.
      const fxLookup = (currency) => {
        if (!currency || String(currency).toUpperCase() === 'CHF') return 1;
        // Fallback approximation for EUR/USD/GBP if envelope-level FX is missing.
        return 1;
      };
      // Resolve binding IBKR market-rule ticks per contract+venue+price so limit
      // prices conform to the exchange's price-tiered increment (not the flat
      // minTick). Prevents "Inactive: price does not conform to minimum price
      // variation" rejections (R2SC/LSEETF, 2026-06-15).
      const { makeTickResolver } = require(path.join(ROOT, 'src/execution/marketRuleResolver'));
      const tickResolverFn = makeTickResolver({ client: guardClient, cacheDir: path.join(ROOT, 'runtime', 'broker-cache', 'market-rules') });
      const runResult = await executeApprovedBasket({ portfolioDir, approvalId, rootDir: ROOT, fetchLiveQuote, fxLookup, tickResolverFn });
      runState = runResult.runState;
      log(`Runner summary: ${JSON.stringify(runState.summary)}`);
      if (runResult.safeguardBlockers && runResult.safeguardBlockers.length > 0) {
        console.error(`SAFEGUARDS BLOCKED: ${runResult.safeguardBlockers.length} blocker(s) — basket NOT transmitted.`);
        for (const b of runResult.safeguardBlockers) {
          console.error(`  ${b.legId || 'basket'} ${b.code}: ${b.reason}`);
        }
        // Still consume intent — even when safeguards block, the operator
        // must mint a fresh intent before retrying. Prevents reuse window.
        const consume = consumeApprovalIntent({ approvalId, rootDir: ROOT });
        log(`approval intent consumed: ${consume.deleted ? 'yes' : `no (${consume.reason || 'unknown'})`}`);
        process.exit(7);
      }
    } catch (error) {
      console.error(`Runner threw: ${error.message}`);
      console.error(error.stack);
      // Consume intent on runner exception too (defensive: don't leave a
      // valid intent file lying around after a failed transmit attempt).
      if (transmitAttempted) {
        try {
          const consume = consumeApprovalIntent({ approvalId, rootDir: ROOT });
          log(`approval intent consumed: ${consume.deleted ? 'yes' : `no (${consume.reason || 'unknown'})`}`);
        } catch (_) { /* best-effort */ }
      }
      process.exit(3);
    }
    // Successful transmit attempt — always consume intent so it can't be reused.
    const consume = consumeApprovalIntent({ approvalId, rootDir: ROOT });
    log(`approval intent consumed: ${consume.deleted ? 'yes' : `no (${consume.reason || 'unknown'})`}`);
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
