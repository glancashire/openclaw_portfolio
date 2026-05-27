const { loadWorkspaceEnv } = require('../shared/env');
const { loadConfig: loadMailgunConfig, sendEmail: sendMailgunEmail } = require('../../lib/mailgun');
const { checkEmailLock, recordEmailSent } = require('./emailDedup');

function getConfiguredRecipient(policy = {}) {
  const recipients = Array.isArray(policy.emailRecipients)
    ? policy.emailRecipients.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  return recipients[0] || null;
}

function getAllConfiguredRecipients(policy = {}) {
  return Array.isArray(policy.emailRecipients)
    ? policy.emailRecipients.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function emailProviderConfigured(policy = {}) {
  loadWorkspaceEnv();
  const provider = String(policy.emailProvider || 'mailgun').trim().toLowerCase();
  if (provider !== 'mailgun') {
    return { ok: false, provider, reason: 'unsupported_provider' };
  }
  try {
    const cfg = loadMailgunConfig();
    return {
      ok: true,
      provider,
      sender: cfg.sender,
      domain: cfg.domain,
    };
  } catch (error) {
    return {
      ok: false,
      provider,
      reason: 'provider_config_missing',
      error: error.message,
    };
  }
}

function emailDeliveryReadiness(policy = {}, status = {}) {
  const mode = String(policy.deliveryMode || 'local_only');
  const recipients = getAllConfiguredRecipients(policy);
  const recipient = recipients[0] || null;
  const providerStatus = emailProviderConfigured(policy);
  const emailEnabled = mode === 'email_only' || mode === 'email_and_repo';
  const missing = [];

  if (!emailEnabled) {
    return {
      enabled: false,
      ready: false,
      mode,
      recipient,
      recipients,
      provider: providerStatus.provider || String(policy.emailProvider || 'mailgun'),
      providerConfigured: providerStatus.ok,
      classification: 'local_only',
      missing: [],
      reason: 'Email delivery is disabled by policy.',
    };
  }

  if (!recipients.length) missing.push('emailRecipients');
  if (!providerStatus.ok) missing.push('providerConfig');
  if (Array.isArray(status.pendingActions) && status.pendingActions.length > 0) missing.push('pendingDeliveryActions');

  return {
    enabled: true,
    ready: missing.length === 0,
    mode,
    recipient,
    recipients,
    provider: providerStatus.provider || String(policy.emailProvider || 'mailgun'),
    providerConfigured: providerStatus.ok,
    providerError: providerStatus.error || null,
    classification: missing.length === 0 ? 'email_ready' : (providerStatus.ok && recipients.length ? 'email_blocked_pending_actions' : 'email_config_incomplete'),
    missing,
    reason: missing.length === 0
      ? 'Email delivery is configured and ready.'
      : `Email delivery is not ready: missing ${missing.join(', ')}.`,
  };
}

async function sendEmailMessage({ policy = {}, to = null, subject, text, html, attachments = [], skipDedup = false }) {
  const recipients = to ? [to] : getAllConfiguredRecipients(policy);
  if (!recipients.length) throw new Error('No email recipient configured.');

  // Deduplication guard: prevent duplicate sends within the TTL window
  if (!skipDedup) {
    const lock = checkEmailLock(subject);
    if (lock.alreadySent) {
      return {
        id: lock.previousMessageId || null,
        message: `Deduplicated — already sent at ${lock.sentAt} (category: ${lock.category})`,
        deduplicated: true,
      };
    }
  }

  const result = await sendMailgunEmail({ to: recipients.join(','), subject, text, html, attachments });

  // Record the send for dedup
  try {
    const messageId = result?.id || null;
    recordEmailSent(subject, { messageId });
  } catch { /* lock write failure is non-fatal */ }

  return result;
}

module.exports = {
  getConfiguredRecipient,
  getAllConfiguredRecipients,
  emailProviderConfigured,
  emailDeliveryReadiness,
  sendEmailMessage,
};
