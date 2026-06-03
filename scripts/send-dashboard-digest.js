'use strict';

/**
 * send-dashboard-digest.js
 *
 * Sends the daily/weekly portfolio digest email using the redesigned
 * three-block investor email (hero + profit/loss + holdings table).
 *
 * Usage:
 *   node scripts/send-dashboard-digest.js --portfolio=etf --frequency=daily
 *   node scripts/send-dashboard-digest.js --portfolio=etf --frequency=weekly --dry-run
 */

const path = require('path');
const { collectPortfolioSummary } = require('../src/reporting/summaryArtifacts');
const { buildReportEmailHtml, buildReportEmailText } = require('../src/reporting/reportEmail');
const { effectiveDeliveryPolicy } = require('../src/reporting/deliveryPolicy');
const { sendEmailMessage } = require('../src/reporting/emailDelivery');

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

function buildDigestSubject({ portfolioName, frequency, generatedAt }) {
  const date = String(generatedAt).slice(0, 10);
  if (String(frequency).toLowerCase() === 'weekly') {
    return `[${portfolioName}] Weekly portfolio digest — week of ${date}`;
  }
  return `[${portfolioName}] Daily portfolio digest — ${date}`;
}

function resolveDigestRecipients(policy = {}, env = process.env) {
  const configured = Array.isArray(policy.emailRecipients)
    ? policy.emailRecipients.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (configured.length) return configured;
  const fallback = String(env.MAILGUN_RECIPIENT || '').trim();
  return fallback ? [fallback] : [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const portfolioDir = path.resolve(process.cwd(), 'portfolio', args.portfolio);
  const portfolioName = args.portfolio;
  const frequency = String(args.frequency).toLowerCase();
  const generatedAt = new Date().toISOString();
  const period = frequency === 'weekly' ? 'Weekly' : 'Daily';

  const summary = await collectPortfolioSummary({ portfolioDir });

  const html = buildReportEmailHtml({
    portfolioName,
    period,
    summaryHtml: '',
    summary,
    portfolioDir,
  });

  const text = buildReportEmailText({
    portfolioName,
    period,
    summaryMarkdown: '',
    summary,
    portfolioDir,
  });

  const subject = buildDigestSubject({ portfolioName, frequency, generatedAt });
  const policy = effectiveDeliveryPolicy(portfolioDir);
  const recipients = resolveDigestRecipients(policy, process.env);

  if (!recipients.length) {
    console.log(JSON.stringify({
      ok: true,
      portfolio: portfolioName,
      frequency,
      dryRun: args.dryRun,
      attempted: false,
      sent: false,
      reason: 'no_recipients_configured',
      subject,
      recipients: [],
    }, null, 2));
    return;
  }

  if (args.dryRun) {
    console.log(JSON.stringify({
      ok: true,
      portfolio: portfolioName,
      frequency,
      dryRun: true,
      attempted: false,
      sent: false,
      subject,
      recipients,
    }, null, 2));
    return;
  }

  const result = await sendEmailMessage({
    policy: { ...policy, emailRecipients: recipients },
    subject,
    text,
    html,
  });

  console.log(JSON.stringify({
    ok: true,
    portfolio: portfolioName,
    frequency,
    dryRun: false,
    attempted: true,
    sent: true,
    subject,
    recipients,
    provider: policy.emailProvider || 'mailgun',
    result,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
