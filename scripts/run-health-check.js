const path = require('path');
const fs = require('fs');
const { runHealthCheck, buildEscalationEmail } = require('../src/reporting/healthReport');
const { effectiveDeliveryPolicy } = require('../src/reporting/deliveryPolicy');
const { emailDeliveryReadiness, sendEmailMessage } = require('../src/reporting/emailDelivery');

const RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours

function loadPreviousBlockerCodes(portfolioDir) {
  try {
    const jsonPath = path.join(portfolioDir, 'health-report.json');
    const prev = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return (prev.health?.blockers || []).map((b) => b.code).filter(Boolean);
  } catch { return []; }
}

function loadEmailRateState(portfolioDir) {
  try {
    const statePath = path.join(portfolioDir, 'health-email-rate.json');
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch { return {}; }
}

function saveEmailRateState(portfolioDir, state) {
  const statePath = path.join(portfolioDir, 'health-email-rate.json');
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
}

async function main() {
  const portfolioDirArg = process.argv[2];
  const sendEmail = process.argv.includes('--send-email');
  const dryRun = process.argv.includes('--dry-run');

  if (!portfolioDirArg) {
    console.error('Usage: node scripts/run-health-check.js <portfolio-dir> [--dry-run] [--send-email]');
    process.exit(1);
  }

  const portfolioDir = path.resolve(portfolioDirArg);

  // Load previous blocker codes BEFORE running the check (which overwrites health-report.json)
  const previousBlockerCodes = loadPreviousBlockerCodes(portfolioDir);

  const { report, artifacts } = await runHealthCheck({ portfolioDir, applySafeFixes: !dryRun });
  let emailDelivery = { attempted: false, sent: false, reason: 'email_not_requested' };

  if (sendEmail) {
    const state = String(report.health?.state || 'healthy').toLowerCase();
    const SEND_STATES = new Set(['attention', 'critical']);

    if (!SEND_STATES.has(state)) {
      emailDelivery = { attempted: false, sent: false, reason: 'suppressed_state_' + state, health: report.health?.health, state };
    } else {
      // Persistence check: current blockers must have been present in the previous report too
      const currentBlockerCodes = (report.health?.blockers || []).map((b) => b.code).filter(Boolean);
      const persistentCodes = currentBlockerCodes.filter((c) => previousBlockerCodes.includes(c));

      if (persistentCodes.length === 0 && currentBlockerCodes.length > 0) {
        // First occurrence — suppress email, wait for next tick to confirm it's real
        emailDelivery = { attempted: false, sent: false, reason: 'suppressed_first_occurrence', newCodes: currentBlockerCodes, state };
      } else {
        // Rate-limit: don't re-email about the same persistent codes within 24h
        const rateState = loadEmailRateState(portfolioDir);
        const now = Date.now();
        const codeKey = persistentCodes.sort().join(',') || currentBlockerCodes.sort().join(',');
        const lastSentMs = rateState[codeKey] || 0;

        if (now - lastSentMs < RATE_LIMIT_MS) {
          emailDelivery = { attempted: false, sent: false, reason: 'rate_limited_24h', codeKey, lastSentAt: new Date(lastSentMs).toISOString(), state };
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
            // Update rate state
            rateState[codeKey] = now;
            saveEmailRateState(portfolioDir, rateState);
          }
        }
      }
    }
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

module.exports = { loadPreviousBlockerCodes, loadEmailRateState, RATE_LIMIT_MS };

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
