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

function buildReportEmailText({ portfolioName, period, summaryMarkdown, deliveryStatus = null, topBlocker = null, nextAction = null }) {
  const pending = Array.isArray(deliveryStatus?.pendingActions) ? deliveryStatus.pendingActions : [];
  return [
    `${portfolioName} ${period} overview`,
    '',
    topBlocker ? `Top blocker: ${topBlocker}` : 'Top blocker: none currently surfaced.',
    nextAction ? `Next action: ${nextAction}` : 'Next action: continue normal monitoring.',
    pending.length
      ? `Delivery posture still has ${pending.length} pending item(s).`
      : 'Delivery posture is clear of pending items.',
    '',
    summaryMarkdown,
  ].join('\n');
}

function buildReportEmailHtml({ portfolioName, period, summaryHtml, deliveryStatus = null, topBlocker = null, nextAction = null }) {
  const pending = Array.isArray(deliveryStatus?.pendingActions) ? deliveryStatus.pendingActions : [];
  const postureTone = pending.length ? 'warn' : 'success';
  const postureLabel = pending.length ? `${pending.length} pending item(s)` : 'Posture clear';
  const blockerTone = topBlocker ? 'danger' : 'success';
  const blockerLabel = topBlocker ? 'Action required' : 'No active blocker';

  const immediateCard = card({
    title: 'Immediate status',
    contentHtml: `
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;">${badge({ label: blockerLabel, tone: blockerTone })}${badge({ label: postureLabel, tone: postureTone })}</div>
      <div style="margin:0 0 12px;padding:14px 16px;background:#fff7ed;border:1px solid #fdba74;border-radius:12px;">
        <div style="font-size:12px;color:#9a3412;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;margin-bottom:6px;">Next action</div>
        <div style="font-size:16px;font-weight:700;color:#7c2d12;line-height:1.5;">${escapeHtml(nextAction || 'Continue normal monitoring.')}</div>
      </div>
      <div style="margin:0;padding:14px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;line-height:1.6;">
        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em;font-weight:700;margin-bottom:6px;">Top blocker</div>
        <div style="font-size:15px;color:#111827;">${escapeHtml(topBlocker || 'No active blocker is currently surfaced.')}</div>
      </div>
    `,
  });

  const postureCard = card({
    title: 'Delivery posture',
    contentHtml: pending.length
      ? bulletList(pending)
      : '<p style="margin:0;color:#6b7280;line-height:1.6;">No delivery-side pending actions are currently surfaced.</p>',
  });

  const summaryCard = card({
    title: 'Portfolio summary',
    contentHtml: `<div class="report-email-summary" style="line-height:1.7;color:#111827;">${summaryHtml}</div>`,
  });

  return page({
    eyebrow: 'OpenClaw Portfolio Report',
    title: `${portfolioName} ${period} overview`,
    subtitle: 'Top blocker and next action first, followed by delivery posture and the full portfolio summary.',
    accent: '#111827',
    bodyHtml: `${immediateCard}${postureCard}${summaryCard}`,
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
