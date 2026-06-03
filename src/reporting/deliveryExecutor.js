const path = require('path');
const { effectiveDeliveryPolicy, reportDeliveryStatus } = require('./deliveryPolicy');
const { emailDeliveryReadiness, sendEmailMessage } = require('./emailDelivery');
const { buildReportEmailSubject, buildReportEmailText, buildReportEmailHtml, loadSummaryEmailSource } = require('./reportEmail');

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
  const { summaryMarkdown, summaryHtml, summary } = loadSummaryEmailSource({ summaryPath, summaryHtmlPath });
  const investorDeliveryContext = { pendingActions: [] };
  const investorNextAction = summary?.recommendedNextStep || null;
  const resolvedSubject = subject || buildReportEmailSubject({ portfolioName, period });
  const text = buildReportEmailText({
    portfolioName,
    period,
    summaryMarkdown,
    summary,
    deliveryStatus: investorDeliveryContext,
    topBlocker: null,
    nextAction: investorNextAction,
    portfolioDir,
  });
  const html = buildReportEmailHtml({
    portfolioName,
    period,
    summaryHtml,
    summary,
    deliveryStatus: investorDeliveryContext,
    topBlocker: null,
    nextAction: investorNextAction,
    portfolioDir,
  });
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
