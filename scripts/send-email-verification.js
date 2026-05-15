const path = require('path');
const { effectiveDeliveryPolicy } = require('../src/reporting/deliveryPolicy');
const { emailDeliveryReadiness, sendEmailMessage } = require('../src/reporting/emailDelivery');

async function main() {
  const args = process.argv.slice(2);
  const portfolioDirArg = args.find((arg) => !arg.startsWith('--'));
  if (!portfolioDirArg) {
    console.error('Usage: node scripts/send-email-verification.js <portfolio-dir> [--to recipient@example.com]');
    process.exit(1);
  }

  const toFlagIndex = args.findIndex((arg) => arg === '--to');
  const explicitTo = toFlagIndex >= 0 ? args[toFlagIndex + 1] : null;
  const portfolioDir = path.resolve(portfolioDirArg);
  const policy = effectiveDeliveryPolicy(portfolioDir);
  const readiness = emailDeliveryReadiness(policy, { pendingActions: [] });

  if (!explicitTo && !readiness.enabled) {
    console.error('Email verification blocked: email delivery is disabled by policy.');
    process.exit(2);
  }
  if (!explicitTo && !readiness.ready) {
    console.error(`Email verification blocked: ${readiness.reason}`);
    process.exit(2);
  }

  const recipient = explicitTo || readiness.recipient;
  if (!recipient) {
    console.error('Email verification blocked: no recipient resolved.');
    process.exit(2);
  }

  const now = new Date().toISOString();
  const subject = `[Portfolio] Email delivery verification (${now.slice(0, 16)})`;
  const text = [
    'This is a live email-delivery verification from the OpenClaw portfolio manager.',
    '',
    `Portfolio: ${path.basename(portfolioDir)}`,
    `Generated at: ${now}`,
    '',
    'If you received this, the Mailgun transport and policy-gated delivery path are both working.',
  ].join('\n');
  const html = `<p>This is a <strong>live email-delivery verification</strong> from the OpenClaw portfolio manager.</p><p><strong>Portfolio:</strong> ${path.basename(portfolioDir)}<br/><strong>Generated at:</strong> ${now}</p><p>If you received this, the Mailgun transport and policy-gated delivery path are both working.</p>`;

  const result = await sendEmailMessage({ policy, to: recipient, subject, text, html });
  console.log(JSON.stringify({ ok: true, recipient, subject, result }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
