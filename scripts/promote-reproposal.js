#!/usr/bin/env node
'use strict';

/* CLI: promote a reproposal envelope into an approved basket. */

const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { promoteReproposalToApproval, latestReproposal } = require(path.join(ROOT, 'src/execution/basketReproposalPromoter'));

function parseArgs(argv) {
  const args = { portfolio: 'etf' };
  for (const a of argv.slice(2)) {
    const [k, v] = a.startsWith('--') ? a.replace(/^--/, '').split('=') : [a, true];
    args[k] = v === undefined ? true : v;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.parent) {
    console.error('Usage: node scripts/promote-reproposal.js --parent=<parent-approval-id> [--portfolio=etf] [--version=N]');
    process.exit(1);
  }
  const portfolio = args.portfolio || 'etf';
  const parentApprovalId = args.parent;
  const version = args.version ? Number(args.version) : null;

  if (!Number.isFinite(version)) {
    const latest = latestReproposal({ portfolio, parentApprovalId, rootDir: ROOT });
    if (!latest) { console.error('No reproposal found for', parentApprovalId); process.exit(2); }
    console.log(`Promoting latest reproposal: ${latest.path} (v${latest.version})`);
  } else {
    console.log(`Promoting reproposal v${version} for ${parentApprovalId}`);
  }

  const result = promoteReproposalToApproval({ portfolio, parentApprovalId, version, rootDir: ROOT });
  if (!result.ok) {
    console.error('Promotion failed:', result);
    process.exit(3);
  }
  console.log(JSON.stringify(result, null, 2));
}

main();
