const BRAND = {
  bg: '#eef4ff',
  surface: '#ffffff',
  surfaceAlt: '#f8fbff',
  text: '#0f172a',
  muted: '#475569',
  subtle: '#64748b',
  line: '#dbe4f0',
  lineStrong: '#c4d3e6',
  header: '#1e3a8a',
  headerGlow: '#3b82f6',
  success: '#166534',
  successBg: '#dcfce7',
  danger: '#991b1b',
  dangerBg: '#fee2e2',
  warn: '#9a3412',
  warnBg: '#ffedd5',
  info: '#1d4ed8',
  infoBg: '#dbeafe',
  neutral: '#334155',
  neutralBg: '#e2e8f0',
  cardBg: '#f8fbff',
  heroText: '#eff6ff',
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
<body style="margin:0;padding:16px;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.text};">
  <div style="max-width:720px;margin:0 auto;background:${BRAND.surface};border-radius:20px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.10);border:1px solid ${BRAND.line};">
    <div style="background:linear-gradient(135deg, ${accent} 0%, ${BRAND.headerGlow} 100%);padding:24px 22px;color:${BRAND.heroText};">
      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.92;font-weight:800;">${escapeHtml(eyebrow)}</div>
      <h1 style="margin:10px 0 0;font-size:28px;line-height:1.15;color:#ffffff;">${escapeHtml(title)}</h1>
      ${subtitle ? `<p style="margin:10px 0 0;font-size:15px;line-height:1.6;color:${BRAND.heroText};max-width:560px;">${escapeHtml(subtitle)}</p>` : ''}
    </div>
    <div style="padding:18px;">${bodyHtml}</div>
    <div style="padding:16px 18px;background:${BRAND.surfaceAlt};border-top:1px solid ${BRAND.line};font-size:12px;color:${BRAND.muted};text-align:center;line-height:1.6;">${escapeHtml(footer)}</div>
  </div>
</body>
</html>`;
}

function card({ title = '', contentHtml, tone = 'default' }) {
  const tones = {
    default: { bg: BRAND.cardBg, border: BRAND.line },
    surface: { bg: BRAND.surface, border: BRAND.line },
    info: { bg: '#eff6ff', border: '#bfdbfe' },
    warn: { bg: '#fff7ed', border: '#fdba74' },
    success: { bg: '#f0fdf4', border: '#86efac' },
  };
  const chosen = tones[tone] || tones.default;
  return `<section style="margin:0 0 14px;padding:16px;background:${chosen.bg};border:1px solid ${chosen.border};border-radius:16px;">
    ${title ? `<h2 style="margin:0 0 12px;font-size:16px;line-height:1.35;color:${BRAND.text};">${escapeHtml(title)}</h2>` : ''}
    ${contentHtml}
  </section>`;
}

function badge({ label, tone = 'info' }) {
  const tones = {
    success: { fg: BRAND.success, bg: BRAND.successBg },
    danger: { fg: BRAND.danger, bg: BRAND.dangerBg },
    warn: { fg: BRAND.warn, bg: BRAND.warnBg },
    info: { fg: BRAND.info, bg: BRAND.infoBg },
    neutral: { fg: BRAND.neutral, bg: BRAND.neutralBg },
  };
  const chosen = tones[tone] || tones.info;
  return `<span style="display:inline-flex;align-items:center;min-height:30px;padding:6px 10px;border-radius:999px;background:${chosen.bg};color:${chosen.fg};font-size:12px;font-weight:800;letter-spacing:0.01em;line-height:1.2;box-sizing:border-box;vertical-align:top;">${escapeHtml(label)}</span>`;
}

function metricGrid(items) {
  const cells = items.map((item) => `<div style="display:inline-block;vertical-align:top;width:calc(50% - 10px);min-width:200px;box-sizing:border-box;margin:0 10px 10px 0;background:${BRAND.surface};border:1px solid ${BRAND.line};border-radius:14px;padding:14px 14px 12px;">
    <div style="font-size:11px;color:${BRAND.subtle};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">${escapeHtml(item.label)}</div>
    <div style="font-size:24px;line-height:1.15;font-weight:800;color:${BRAND.text};word-break:break-word;">${escapeHtml(item.value)}</div>
    ${item.detail ? `<div style="margin-top:6px;font-size:12px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(item.detail)}</div>` : ''}
  </div>`).join('');
  return `<div style="font-size:0;">${cells}</div>`;
}

function kvTable(rows) {
  return `<table style="width:100%;border-collapse:collapse;">${rows.map((row) => `<tr>
    <td style="padding:8px 0;color:${BRAND.muted};vertical-align:top;width:38%;font-size:13px;line-height:1.5;">${escapeHtml(row.label)}</td>
    <td style="padding:8px 0;color:${BRAND.text};font-weight:700;vertical-align:top;font-size:14px;line-height:1.55;">${row.htmlValue || escapeHtml(row.value)}</td>
  </tr>`).join('')}</table>`;
}

function dataTable({ columns, rows }) {
  const header = `<tr style="background:${BRAND.surfaceAlt};">${columns.map((column) => `<th style="padding:10px 10px;text-align:${column.align || 'left'};border-bottom:1px solid ${BRAND.lineStrong};font-size:11px;color:${BRAND.subtle};text-transform:uppercase;letter-spacing:0.05em;line-height:1.3;">${escapeHtml(column.label)}</th>`).join('')}</tr>`;
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((cell, index) => `<td style="padding:10px 10px;border-bottom:1px solid ${BRAND.line};text-align:${columns[index].align || 'left'};font-size:13px;line-height:1.45;color:${BRAND.text};vertical-align:top;word-break:break-word;">${cell}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${columns.length}" style="padding:14px 10px;color:${BRAND.muted};font-style:italic;font-size:13px;">No items.</td></tr>`;
  return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:${BRAND.surface};border:1px solid ${BRAND.line};border-radius:14px;overflow:hidden;">${header}${body}</table></div>`;
}

function bulletList(items) {
  if (!items.length) return `<p style="margin:0;color:${BRAND.muted};line-height:1.6;">No items.</p>`;
  return `<ul style="margin:0;padding-left:18px;color:${BRAND.text};">${items.map((item) => `<li style="margin:0 0 8px;line-height:1.55;">${escapeHtml(item)}</li>`).join('')}</ul>`;
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
