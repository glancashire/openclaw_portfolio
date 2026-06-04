const path = require('path');
const { runHealthCheck, buildEscalationEmail } = require('../src/reporting/healthReport');
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
    // Only email when state is attention or critical (persistent, non-autofixable issues)
    const state = String(report.health?.state || 'healthy').toLowerCase();
    const SEND_STATES = new Set(['attention', 'critical']);
    if (!SEND_STATES.has(state)) {
      emailDelivery = { attempted: false, sent: false, reason: 'suppressed_state_' + state, health: report.health?.health, state };
    } else {
    const policy = effectiveDeliveryPolicy(portfolioDir);
    const readiness = emailDeliveryReadiness(policy, { pendingActions: [] });
    if (!readiness.enabled) {
      emailDelivery = { attempted: false, sent: false, reason: 'email_disabled_by_policy', detail: readiness.reason };
    } else if (!readiness.ready) {
      emailDelivery = { attempted: false, sent: false, reason: 'email_not_ready', detail: readiness.reason, missing: readiness.missing };
    } else {
      const escalation = buildEscalationEmail(report);
      const result = await sendEmailMessage({ policy, subject: escalation.subject, text: escalation.text, html: escalation.html });
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
