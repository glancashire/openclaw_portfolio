const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
  const pendingHtml = pending.length
    ? `<ul>${pending.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p>No delivery-side pending actions are currently surfaced.</p>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:820px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="padding:20px 24px;background:#111827;color:#fff;">
      <h1 style="margin:0;font-size:20px;">${escapeHtml(portfolioName)} ${escapeHtml(period)} overview</h1>
    </div>
    <div style="padding:20px 24px;">
      <h2 style="font-size:16px;color:#374151;">Delivery posture</h2>
      ${pendingHtml}
    </div>
    <div style="padding:0 24px 24px;">
      ${summaryHtml}
    </div>
  </div>
</body>
</html>`;
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
