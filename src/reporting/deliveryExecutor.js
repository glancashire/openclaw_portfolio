const path = require('path');
const { effectiveDeliveryPolicy, reportDeliveryStatus } = require('./deliveryPolicy');
const { emailDeliveryReadiness, sendEmailMessage } = require('./emailDelivery');
const { buildReportEmailSubject, buildReportEmailText, buildReportEmailHtml, loadSummaryEmailSource } = require('./reportEmail');

function extractHealthHighlights(summaryMarkdown = '') {
  const lines = String(summaryMarkdown || '').split(/\r?\n/);
  let topBlocker = null;
  let nextAction = null;

  for (const line of lines) {
    const blockerMatch = line.match(/^- \[([^\]]+)\]\s+(.+)$/);
    if (!topBlocker && blockerMatch) {
      topBlocker = `[${blockerMatch[1]}] ${blockerMatch[2]}`;
      continue;
    }
    const actionMatch = line.match(/^- (.+)$/);
    if (!nextAction && actionMatch && lines.includes('## Recommended next actions')) {
      const sectionIndex = lines.indexOf('## Recommended next actions');
      const lineIndex = lines.indexOf(line);
      if (lineIndex > sectionIndex) {
        nextAction = actionMatch[1];
      }
    }
  }

  return { topBlocker, nextAction };
}

async function deliverPortfolioSummaryEmail({ portfolioDir, period = 'summary', summaryPath, summaryHtmlPath = null, subject = null, sendEmailImpl = sendEmailMessage }) {
  const policy = effectiveDeliveryPolicy(portfolioDir);
  const deliveryStatus = reportDeliveryStatus({ portfolioDir });
  const emailReadiness = emailDeliveryReadiness(policy, deliveryStatus);

  if (!emailReadiness.enabled) {
    return {
      attempted: false,
      sent: false,
      mode: policy.deliveryMode,
      reason: 'email_disabled_by_policy',
      detail: emailReadiness.reason,
    };
  }

  if (!emailReadiness.ready) {
    return {
      attempted: false,
      sent: false,
      mode: policy.deliveryMode,
      reason: 'email_not_ready',
      detail: emailReadiness.reason,
      missing: emailReadiness.missing,
    };
  }

  const portfolioName = path.basename(portfolioDir);
  const { summaryMarkdown, summaryHtml } = loadSummaryEmailSource({ summaryPath, summaryHtmlPath });
  const { topBlocker, nextAction } = extractHealthHighlights(summaryMarkdown);
  const resolvedSubject = subject || buildReportEmailSubject({ portfolioName, period });
  const text = buildReportEmailText({ portfolioName, period, summaryMarkdown, deliveryStatus, topBlocker, nextAction });
  const html = buildReportEmailHtml({ portfolioName, period, summaryHtml, deliveryStatus, topBlocker, nextAction });
  const result = await sendEmailImpl({ policy, subject: resolvedSubject, text, html });

  return {
    attempted: true,
    sent: true,
    mode: policy.deliveryMode,
    subject: resolvedSubject,
    recipients: emailReadiness.recipients,
    provider: emailReadiness.provider,
    result,
  };
}

module.exports = {
  deliverPortfolioSummaryEmail,
};
