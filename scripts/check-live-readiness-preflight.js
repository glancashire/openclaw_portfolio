'use strict';

const path = require('path');
const {
  evaluateLiveReadinessPreflight,
  armLiveExecutionWindow,
  clearLiveExecutionArm,
} = require('../src/execution/liveReadinessPreflight');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');
  if (help) {
    console.log('Usage: node scripts/check-live-readiness-preflight.js [portfolio-dir] [--json] [--arm-hours N] [--clear-arm]');
    return;
  }

  const positional = args.filter((arg) => !arg.startsWith('--'));
  const portfolioDir = path.resolve(positional[0] || path.join(__dirname, '..', 'portfolio', 'etf'));
  const json = args.includes('--json');
  const clearArm = args.includes('--clear-arm');
  const armHours = Number(getArg('--arm-hours') || 0);

  if (clearArm) clearLiveExecutionArm(portfolioDir);
  if (Number.isFinite(armHours) && armHours > 0) {
    armLiveExecutionWindow(portfolioDir, {
      expiresAt: new Date(Date.now() + armHours * 36e5).toISOString(),
      note: 'Operator-armed via live readiness preflight CLI.',
    });
  }

  const result = await evaluateLiveReadinessPreflight({ portfolioDir });
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Live readiness preflight for ${result.portfolio}`);
    console.log(`- ok: ${result.ok}`);
    console.log(`- execution mode: ${result.executionMode}`);
    console.log(`- armed for market open: ${result.armedForMarketOpen}`);
    console.log(`- arm expires at: ${result.armExpiresAt || 'n/a'}`);
    console.log(`- broker readiness: ${result.brokerReadiness.message}`);
    console.log(`- approved rows: ${result.approvalState.approvedCount}`);
    console.log(`- executable rows: ${result.approvalState.executableCount}`);
    console.log(`- latest approval: ${result.approvalState.latestApprovedAt || 'n/a'}`);
    console.log(`- market open now: ${result.marketWindow.openNow} (${result.marketWindow.reason})`);
    if (result.blockers.length) {
      console.log('Blockers:');
      for (const blocker of result.blockers) console.log(`- [${blocker.code}] ${blocker.message}`);
    }
    if (result.warnings.length) {
      console.log('Warnings:');
      for (const warning of result.warnings) console.log(`- [${warning.code}] ${warning.message}`);
    }
    console.log(`Recommended next action: ${result.recommendedNextAction}`);
  }

  if (!result.ok) process.exit(2);
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
