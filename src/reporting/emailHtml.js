const BRAND = {
  bg: '#f3f4f6',
  surface: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  line: '#e5e7eb',
  header: '#111827',
  success: '#166534',
  successBg: '#dcfce7',
  danger: '#991b1b',
  dangerBg: '#fee2e2',
  warn: '#92400e',
  warnBg: '#fef3c7',
  info: '#1d4ed8',
  infoBg: '#dbeafe',
  cardBg: '#f9fafb',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value, currency = 'CHF') {
  if (!Number.isFinite(Number(value))) return '—';
  return `${currency} ${Number(value).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return '—';
  const numeric = Number(value);
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}%`;
}

function page({ eyebrow = 'OpenClaw Portfolio Manager', title, subtitle = '', accent = BRAND.header, bodyHtml, footer = 'OpenClaw Portfolio Manager' }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:24px;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${BRAND.text};">
  <div style="max-width:860px;margin:0 auto;background:${BRAND.surface};border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(17,24,39,0.08);border:1px solid ${BRAND.line};">
    <div style="background:${accent};padding:28px 32px;color:#ffffff;">
      <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.8;font-weight:700;">${escapeHtml(eyebrow)}</div>
      <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">${escapeHtml(title)}</h1>
      ${subtitle ? `<p style="margin:10px 0 0;font-size:15px;line-height:1.6;opacity:0.92;">${escapeHtml(subtitle)}</p>` : ''}
    </div>
    <div style="padding:28px 32px;">${bodyHtml}</div>
    <div style="padding:18px 32px;background:${BRAND.cardBg};border-top:1px solid ${BRAND.line};font-size:12px;color:${BRAND.muted};text-align:center;">${escapeHtml(footer)}</div>
  </div>
</body>
</html>`;
}

function card({ title = '', contentHtml }) {
  return `<section style="margin:0 0 20px;padding:20px 22px;background:${BRAND.cardBg};border:1px solid ${BRAND.line};border-radius:14px;">
    ${title ? `<h2 style="margin:0 0 14px;font-size:16px;color:${BRAND.text};">${escapeHtml(title)}</h2>` : ''}
    ${contentHtml}
  </section>`;
}

function badge({ label, tone = 'info' }) {
  const tones = {
    success: { fg: BRAND.success, bg: BRAND.successBg },
    danger: { fg: BRAND.danger, bg: BRAND.dangerBg },
    warn: { fg: BRAND.warn, bg: BRAND.warnBg },
    info: { fg: BRAND.info, bg: BRAND.infoBg },
    neutral: { fg: BRAND.muted, bg: '#f3f4f6' },
  };
  const chosen = tones[tone] || tones.info;
  return `<span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${chosen.bg};color:${chosen.fg};font-size:12px;font-weight:700;letter-spacing:0.02em;">${escapeHtml(label)}</span>`;
}

function metricGrid(items) {
  const cells = items.map((item) => `<div style="flex:1 1 180px;min-width:180px;background:${BRAND.surface};border:1px solid ${BRAND.line};border-radius:12px;padding:16px 18px;">
    <div style="font-size:12px;color:${BRAND.muted};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(item.label)}</div>
    <div style="font-size:24px;font-weight:700;color:${BRAND.text};">${escapeHtml(item.value)}</div>
    ${item.detail ? `<div style="margin-top:6px;font-size:12px;color:${BRAND.muted};">${escapeHtml(item.detail)}</div>` : ''}
  </div>`).join('');
  return `<div style="display:flex;flex-wrap:wrap;gap:14px;">${cells}</div>`;
}

function kvTable(rows) {
  return `<table style="width:100%;border-collapse:collapse;">${rows.map((row) => `<tr>
    <td style="padding:9px 0;color:${BRAND.muted};vertical-align:top;width:38%;">${escapeHtml(row.label)}</td>
    <td style="padding:9px 0;color:${BRAND.text};font-weight:600;vertical-align:top;">${row.htmlValue || escapeHtml(row.value)}</td>
  </tr>`).join('')}</table>`;
}

function dataTable({ columns, rows }) {
  const header = `<tr style="background:${BRAND.surface};">${columns.map((column) => `<th style="padding:10px 12px;text-align:${column.align || 'left'};border-bottom:2px solid ${BRAND.line};font-size:12px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(column.label)}</th>`).join('')}</tr>`;
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((cell, index) => `<td style="padding:10px 12px;border-bottom:1px solid ${BRAND.line};text-align:${columns[index].align || 'left'};font-size:14px;color:${BRAND.text};">${cell}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${columns.length}" style="padding:14px 12px;color:${BRAND.muted};font-style:italic;">No items.</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;background:${BRAND.surface};border-radius:12px;overflow:hidden;">${header}${body}</table>`;
}

function bulletList(items) {
  if (!items.length) return `<p style="margin:0;color:${BRAND.muted};">No items.</p>`;
  return `<ul style="margin:0;padding-left:20px;color:${BRAND.text};">${items.map((item) => `<li style="margin:0 0 8px;line-height:1.5;">${escapeHtml(item)}</li>`).join('')}</ul>`;
}

module.exports = {
  BRAND,
  escapeHtml,
  formatCurrency,
  formatPercent,
  page,
  card,
  badge,
  metricGrid,
  kvTable,
  dataTable,
  bulletList,
};
