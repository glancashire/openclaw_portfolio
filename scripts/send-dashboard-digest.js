const path = require('path');
const { sendDashboardDigest } = require('../src/reporting/dashboardDigest');

function parseArgs(argv) {
  const args = { portfolio: 'etf', frequency: 'daily', dryRun: false };
  for (const arg of argv) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--portfolio=')) args.portfolio = arg.slice('--portfolio='.length) || 'etf';
    else if (arg.startsWith('--frequency=')) args.frequency = arg.slice('--frequency='.length) || 'daily';
  }
  if (!['daily', 'weekly'].includes(String(args.frequency).toLowerCase())) {
    throw new Error('frequency must be daily or weekly');
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const portfolioDir = path.resolve(process.cwd(), 'portfolio', args.portfolio);
  const result = await sendDashboardDigest({
    portfolioDir,
    frequency: String(args.frequency).toLowerCase(),
    dryRun: Boolean(args.dryRun),
  });
  console.log(JSON.stringify({
    ok: true,
    portfolio: args.portfolio,
    frequency: String(args.frequency).toLowerCase(),
    dryRun: Boolean(args.dryRun),
    attempted: Boolean(result.attempted),
    sent: Boolean(result.sent),
    reason: result.reason || null,
    subject: result.subject,
    recipients: result.recipients || [],
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
