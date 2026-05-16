const path = require('path');

function buildHealthMonitorJob({ portfolioDir, scheduleExpr = '0 8,14,20 * * *', tz = 'UTC' }) {
  const resolvedPortfolioDir = path.resolve(portfolioDir);
  const portfolio = path.basename(resolvedPortfolioDir);
  return {
    name: `portfolio-health-monitor-${portfolio}`,
    description: `Scheduled health monitor for portfolio ${portfolio}`,
    schedule: {
      kind: 'cron',
      expr: scheduleExpr,
      tz,
    },
    payload: {
      kind: 'agentTurn',
      message: `Run node scripts/run-health-check.js ${resolvedPortfolioDir} --send-email in /home/ubuntu/.openclaw/workspace. Report the JSON result briefly, and flag any unresolved blockers clearly.`,
      timeoutSeconds: 900,
      toolsAllow: ['exec', 'read'],
      lightContext: true,
    },
    sessionTarget: 'isolated',
    delivery: {
      mode: 'announce',
    },
    enabled: true,
  };
}

function parseArgs(argv) {
  const args = { action: 'show', portfolioDir: null, scheduleExpr: '0 8,14,20 * * *', tz: 'UTC', jobId: null };
  const parts = [...argv];
  if (parts[0] && !parts[0].startsWith('-')) args.action = parts.shift();
  while (parts.length) {
    const part = parts.shift();
    if (part === '--tz') args.tz = parts.shift();
    else if (part === '--expr') args.scheduleExpr = parts.shift();
    else if (part === '--job-id') args.jobId = parts.shift();
    else if (!args.portfolioDir) args.portfolioDir = part;
  }
  return args;
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.portfolioDir) {
    console.error('Usage: node scripts/health-monitor-cron.js <show|payload> <portfolio-dir> [--expr "0 8,14,20 * * *"] [--tz UTC]');
    process.exit(1);
  }
  const job = buildHealthMonitorJob(args);
  console.log(JSON.stringify({ action: args.action, portfolio: path.basename(path.resolve(args.portfolioDir)), job }, null, 2));
}

module.exports = {
  buildHealthMonitorJob,
  parseArgs,
};
