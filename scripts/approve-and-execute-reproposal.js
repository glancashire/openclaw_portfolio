#!/usr/bin/env node
'use strict';

/*
 * Phase 192 — One-command approve-and-execute for a reproposal.
 *
 * Promotes the latest (or specified) reproposal envelope into approved baskets,
 * invokes the canonical basket runner, then runs the standard lifecycle
 * (monitor → reconcile → mirror → notify → resync → reproposal if needed).
 *
 * The assistant ONLY runs this after the operator explicitly types `approve`.
 */

const path = require('path');
const ROOT = path.join(__dirname, '..');

const { promoteReproposalToApproval } = require(path.join(ROOT, 'src/execution/basketReproposalPromoter'));
const { executeApprovedBasket } = require(path.join(ROOT, 'src/execution/basketExecutionRunner'));
const { runBasketLifecycle } = require(path.join(ROOT, 'src/execution/basketLifecycle'));
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, v] = a.replace(/^--/, '').split('=');
    args[k] = v === undefined ? true : v;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.parent) {
    console.error('Usage: node scripts/approve-and-execute-reproposal.js --parent=<parent-approval-id> [--portfolio=etf] [--version=N]');
    process.exit(1);
  }
  const portfolio = args.portfolio || 'etf';
  const version = args.version ? Number(args.version) : null;
  const portfolioDir = path.join(ROOT, 'portfolio', portfolio);

  console.log(`=== approve-and-execute reproposal for ${args.parent} (portfolio=${portfolio}${version ? `, v${version}` : ''}) ===`);

  // 1. Promote reproposal → approved basket
  const promoted = promoteReproposalToApproval({ portfolio, parentApprovalId: args.parent, version, rootDir: ROOT });
  if (!promoted.ok) {
    console.error('Promotion failed:', promoted);
    process.exit(2);
  }
  console.log(`Promoted reproposal v${promoted.version} → ${promoted.path} (alreadyPromoted=${promoted.alreadyPromoted})`);
  const approvalId = `${args.parent}-reproposal-${promoted.version}`;

  // 2. Run canonical runner
  console.log('Transmitting via canonical basket runner...');
  let runResult;
  try {
    // Resolve binding IBKR market-rule ticks per contract+venue+price (see
    // docs/operations/ibkr-tick-sizes.md). Critical on the retry-after-cancel
    // path: a reproposal bumps the limit, and it must land on the venue's tick.
    const { makeTickResolver } = require(path.join(ROOT, 'src/execution/marketRuleResolver'));
    const tickClient = new InteractiveBrokersClient({ portfolio });
    const tickResolverFn = makeTickResolver({ client: tickClient, cacheDir: path.join(ROOT, 'runtime', 'broker-cache', 'market-rules') });
    runResult = await executeApprovedBasket({ portfolioDir, approvalId, rootDir: ROOT, tickResolverFn });
  } catch (error) {
    console.error('Runner failed:', error.message);
    console.error(error.stack);
    process.exit(3);
  }
  console.log('Runner summary:', JSON.stringify(runResult.runState.summary));
  for (const [id, leg] of Object.entries(runResult.runState.legs)) {
    console.log(`  ${id} ${leg.instrument}: status=${leg.status} brokerOrderId=${leg.brokerOrderId || '-'}`);
  }

  // 3. Run lifecycle (monitor + reconcile + mirror + notify + resync + reproposal hook)
  const client = new InteractiveBrokersClient({ portfolio });
  const result = await runBasketLifecycle({
    portfolio,
    approvalId,
    rootDir: ROOT,
    portfolioDir,
    client,
    runState: runResult.runState,
  });

  console.log('=== Final ===');
  console.log(`Approval id: ${approvalId}`);
  console.log(`Runs artifact: ${result.reconciledPath}`);
  console.log(`Filled legs: ${result.reconciled.summary.filled || 0} / Cancelled: ${result.reconciled.summary.cancelled || 0} / Total: ${result.reconciled.summary.total}`);
  if (result.reproposal && !result.reproposal.skipped) {
    console.log(`\nReproposal v${result.reproposal.version}: ${result.reproposal.path}`);
    console.log('>>> Awaiting next single operator approval (`approve`) for this reproposal.');
  } else if (result.cancelledLegCount > 0) {
    console.log('Cancelled legs found but no reproposal generated.');
  } else {
    console.log('All legs filled. Round complete.');
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
