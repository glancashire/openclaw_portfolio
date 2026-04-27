const fs = require('fs');
const path = require('path');

const SECRET_PATH = path.join(__dirname, '..', 'secrets', 'mailgun.json');

function loadConfig() {
  if (!fs.existsSync(SECRET_PATH)) {
    throw new Error(`Missing Mailgun secret file: ${SECRET_PATH}`);
  }
  const raw = JSON.parse(fs.readFileSync(SECRET_PATH, 'utf8'));
  const cfg = raw.mailgun || {};
  const apiKey = process.env.MAILGUN_API_KEY || cfg.apiKey;
  const domain = process.env.MAILGUN_DOMAIN || cfg.domain;
  const sender = process.env.MAILGUN_SENDER || cfg.sender;

  if (!apiKey) throw new Error('Missing MAILGUN_API_KEY / mailgun.apiKey');
  if (!domain) throw new Error('Missing MAILGUN_DOMAIN / mailgun.domain');
  if (!sender) throw new Error('Missing MAILGUN_SENDER / mailgun.sender');

  return { apiKey, domain, sender };
}

function normalizeAttachments(attachments = []) {
  return attachments.map((attachment, index) => {
    if (typeof attachment === 'string') {
      const content = fs.readFileSync(attachment);
      return {
        filename: path.basename(attachment),
        content,
      };
    }

    if (!attachment || typeof attachment !== 'object') {
      throw new Error(`Invalid attachment at index ${index}`);
    }

    if (attachment.path) {
      const content = fs.readFileSync(attachment.path);
      return {
        filename: attachment.filename || path.basename(attachment.path),
        content,
      };
    }

    if (attachment.filename && attachment.content != null) {
      return {
        filename: attachment.filename,
        content: Buffer.isBuffer(attachment.content)
          ? attachment.content
          : Buffer.from(String(attachment.content)),
      };
    }

    throw new Error(`Unsupported attachment at index ${index}`);
  });
}

async function sendEmail({ to, subject, text, html, attachments = [] }) {
  const { apiKey, domain, sender } = loadConfig();
  if (!to) throw new Error('Missing recipient: to');
  if (!subject) throw new Error('Missing subject');
  if (!text && !html) throw new Error('Provide text and/or html');

  const form = new FormData();
  form.append('from', sender);
  form.append('to', to);
  form.append('subject', subject);
  if (text) form.append('text', text);
  if (html) form.append('html', html);

  for (const attachment of normalizeAttachments(attachments)) {
    const blob = new Blob([attachment.content]);
    form.append('attachment', blob, attachment.filename);
  }

  const auth = Buffer.from(`api:${apiKey}`).toString('base64');
  const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
    },
    body: form,
  });

  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Mailgun send failed (${res.status}): ${bodyText}`);
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    return { raw: bodyText };
  }
}

module.exports = { sendEmail, loadConfig };
