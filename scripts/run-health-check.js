const path = require('path');
const { runHealthCheck } = require('../src/reporting/healthReport');
const { effectiveDeliveryPolicy } = require('../src/reporting/deliveryPolicy');
const { emailDeliveryReadiness, sendEmailMessage } = require('../src/reporting/emailDelivery');

async function main() {
  const portfolioDirArg = process.argv[2];
  const sendEmail = process.argv.includes('--send-email');
  const dryRun = process.argv.includes('--dry-run');

  if (!portfolioDirArg) {
    console.error('Usage: node scripts/run-health-check.js <portfolio-dir> [--dry-run] [--send-email]');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);
  const { report, artifacts } = await runHealthCheck({ portfolioDir, applySafeFixes: !dryRun });
  let emailDelivery = { attempted: false, sent: false, reason: 'email_not_requested' };

  if (sendEmail) {
    // Suppress green health report emails — only send when there are issues
    const severity = String(report.health?.severity || '').toLowerCase();
    const healthStatus = String(report.health?.health || '').toLowerCase();
    if (severity === 'none' || healthStatus === 'healthy' || (report.health?.blockerCount === 0 && severity !== 'high' && severity !== 'critical')) {
      emailDelivery = { attempted: false, sent: false, reason: 'suppressed_green_health', health: report.health?.health, severity };
    } else {
    const policy = effectiveDeliveryPolicy(portfolioDir);
    const readiness = emailDeliveryReadiness(policy, { pendingActions: [] });
    if (!readiness.enabled) {
      emailDelivery = { attempted: false, sent: false, reason: 'email_disabled_by_policy', detail: readiness.reason };
    } else if (!readiness.ready) {
      emailDelivery = { attempted: false, sent: false, reason: 'email_not_ready', detail: readiness.reason, missing: readiness.missing };
    } else {
      const subject = `[Portfolio] ${report.portfolio} system health report (${String(report.generatedAt).slice(0, 10)})`;
      const text = artifacts.markdown;
      const html = artifacts.html;
      const result = await sendEmailMessage({ policy, subject, text, html });
      emailDelivery = { attempted: true, sent: true, result, recipients: readiness.recipients, provider: readiness.provider };
    }
    } // close green-suppression else
  }

  console.log(JSON.stringify({
    ok: true,
    portfolio: report.portfolio,
    health: report.health,
    selfHeal: report.selfHeal,
    artifacts: {
      jsonPath: artifacts.jsonPath,
      mdPath: artifacts.mdPath,
      htmlPath: artifacts.htmlPath,
    },
    emailDelivery,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
