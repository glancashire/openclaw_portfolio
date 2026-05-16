const path = require('path');
const { buildHealthMonitorJob } = require('./health-monitor-cron');

function main() {
  const portfolioDirArg = process.argv[2];
  const expr = process.argv.includes('--expr') ? process.argv[process.argv.indexOf('--expr') + 1] : '0 8,14,20 * * *';
  const tz = process.argv.includes('--tz') ? process.argv[process.argv.indexOf('--tz') + 1] : 'UTC';
  if (!portfolioDirArg) {
    console.error('Usage: node scripts/check-health-monitor-cron.js <portfolio-dir> [--expr "0 8,14,20 * * *"] [--tz UTC]');
    process.exit(1);
  }
  const portfolioDir = path.resolve(portfolioDirArg);
  const job = buildHealthMonitorJob({ portfolioDir, scheduleExpr: expr, tz });
  console.log(JSON.stringify({
    portfolio: path.basename(portfolioDir),
    expectedJobName: job.name,
    schedule: job.schedule,
    sessionTarget: job.sessionTarget,
    deliveryMode: job.delivery.mode,
    payloadPreview: job.payload.message,
  }, null, 2));
}

if (require.main === module) main();
