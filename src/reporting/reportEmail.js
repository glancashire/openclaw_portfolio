const fs = require('fs');
const path = require('path');
const {
  escapeHtml,
  page,
  card,
  badge,
  bulletList,
} = require('./emailHtml');

function buildReportEmailSubject({ portfolioName, period, generatedAt = null }) {
  const stamp = generatedAt ? String(generatedAt).slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `[Portfolio] ${portfolioName} ${period} overview (${stamp})`;
}

function buildReportEmailText({ portfolioName, period, summaryMarkdown, deliveryStatus = null }) {
  const pending = Array.isArray(deliveryStatus?.pendingActions) ? deliveryStatus.pendingActions : [];
  return [
    `${portfolioName} ${period} overview`,
    '',
    pending.length
      ? `Delivery posture still has ${pending.length} pending item(s).`
      : 'Delivery posture is clear of pending items.',
    '',
    summaryMarkdown,
  ].join('\n');
}

function buildReportEmailHtml({ portfolioName, period, summaryHtml, deliveryStatus = null }) {
  const pending = Array.isArray(deliveryStatus?.pendingActions) ? deliveryStatus.pendingActions : [];
  const postureTone = pending.length ? 'warn' : 'success';
  const postureLabel = pending.length ? `${pending.length} pending item(s)` : 'Posture clear';

  const introCard = card({
    title: 'Delivery posture',
    contentHtml: `
      <div style="margin-bottom:14px;">${badge({ label: postureLabel, tone: postureTone })}</div>
      ${pending.length
        ? bulletList(pending)
        : '<p style="margin:0;color:#6b7280;line-height:1.6;">No delivery-side pending actions are currently surfaced.</p>'}
    `,
  });

  const summaryCard = card({
    title: 'Portfolio summary',
    contentHtml: `<div class="report-email-summary" style="line-height:1.7;color:#111827;">${summaryHtml}</div>`,
  });

  return page({
    eyebrow: 'OpenClaw Portfolio Report',
    title: `${portfolioName} ${period} overview`,
    subtitle: 'Structured portfolio summary and delivery posture for operator review.',
    accent: '#111827',
    bodyHtml: `${introCard}${summaryCard}`,
    footer: 'OpenClaw Portfolio Manager • Email delivery remains policy-gated and auditable',
  });
}

function loadSummaryEmailSource({ summaryPath = null, summaryHtmlPath = null }) {
  if (!summaryPath) throw new Error('summaryPath is required');
  const summaryMarkdown = fs.readFileSync(summaryPath, 'utf8');
  const resolvedHtmlPath = summaryHtmlPath || path.join(path.dirname(summaryPath), `${path.basename(summaryPath, path.extname(summaryPath))}.html`);
  const summaryHtml = fs.existsSync(resolvedHtmlPath)
    ? fs.readFileSync(resolvedHtmlPath, 'utf8')
    : `<pre>${escapeHtml(summaryMarkdown)}</pre>`;
  return { summaryMarkdown, summaryHtml, summaryHtmlPath: resolvedHtmlPath };
}

module.exports = {
  buildReportEmailSubject,
  buildReportEmailText,
  buildReportEmailHtml,
  loadSummaryEmailSource,
};
