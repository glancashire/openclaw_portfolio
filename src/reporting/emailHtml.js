/**
 * Shared HTML email building blocks for OpenClaw Portfolio Manager.
 *
 * Light + dark mode strategy (email-safe):
 * 1. Inline styles render the LIGHT palette as fallback for clients that strip <style>
 *    blocks (Outlook Windows, some Gmail configurations).
 * 2. A <style> block in <head> uses class hooks (.t-page, .t-card, .t-text, ...) and
 *    a `@media (prefers-color-scheme: dark)` rule to override colors in dark-aware
 *    clients (Apple Mail, iOS Mail 16+, Outlook macOS, Spark, Hey, Thunderbird).
 * 3. `[data-ogsc]` and `[data-ogsb]` selectors mirror those overrides for
 *    Outlook.com / Outlook 365 web dark mode.
 *
 * Tokens documented in: docs/email-dashboard-light-dark-spec.md
 */

const TOKENS = {
  light: {
    bg:          '#ffffff',
    surface:     '#ffffff',
    surfaceAlt:  '#f7f8fb',
    text:        '#0f172a',
    muted:       '#475569',
    subtle:      '#64748b',
    line:        '#e5e7eb',
    lineStrong:  '#cbd5e1',
    accent:      '#1d4ed8',
    // PnL semantics: deeper text on stronger pill fill for AA contrast on white
    positive:    '#166534',
    positiveBg:  '#dcfce7',
    negative:    '#991b1b',
    negativeBg:  '#fee2e2',
    warn:        '#9a3412',
    warnBg:      '#ffedd5',
    info:        '#1e40af',
    infoBg:      '#dbeafe',
    success:     '#166534',
    successBg:   '#dcfce7',
    danger:      '#991b1b',
    dangerBg:    '#fee2e2',
    neutral:     '#334155',
    neutralBg:   '#f1f5f9',
  },
  dark: {
    bg:          '#0b1220',
    surface:     '#0f1623',
    surfaceAlt:  '#131c2e',
    text:        '#e6ecf5',
    muted:       '#9aa6b8',
    subtle:      '#6b7a8d',
    line:        'rgba(148,163,184,0.18)',
    lineStrong:  'rgba(148,163,184,0.28)',
    accent:      '#7aa2ff',
    positive:    '#34d399',
    positiveBg:  'rgba(52,211,153,0.10)',
    negative:    '#f87171',
    negativeBg:  'rgba(248,113,113,0.10)',
    warn:        '#fbbf24',
    warnBg:      'rgba(251,191,36,0.10)',
    info:        '#93c5fd',
    infoBg:      'rgba(147,197,253,0.08)',
    success:     '#34d399',
    successBg:   'rgba(52,211,153,0.10)',
    danger:      '#f87171',
    dangerBg:    'rgba(248,113,113,0.10)',
    neutral:     '#cbd5e1',
    neutralBg:   'rgba(203,213,225,0.10)',
  },
};

// BRAND keeps the same shape as before for backward compat. Values are the LIGHT palette.
// Some legacy callers read BRAND.success/danger/etc. directly.
const BRAND = {
  bg:           TOKENS.light.bg,
  surface:      TOKENS.light.surface,
  surfaceAlt:   TOKENS.light.surfaceAlt,
  text:         TOKENS.light.text,
  muted:        TOKENS.light.muted,
  subtle:       TOKENS.light.subtle,
  line:         TOKENS.light.line,
  lineStrong:   TOKENS.light.lineStrong,
  // Header is now the same surface (no gradient). These two stay for compatibility
  // with anything that consults them; the page() function no longer applies a gradient.
  header:       TOKENS.light.surface,
  headerGlow:   TOKENS.light.surface,
  success:      TOKENS.light.success,
  successBg:    TOKENS.light.successBg,
  danger:       TOKENS.light.danger,
  dangerBg:     TOKENS.light.dangerBg,
  warn:         TOKENS.light.warn,
  warnBg:       TOKENS.light.warnBg,
  info:         TOKENS.light.info,
  infoBg:       TOKENS.light.infoBg,
  neutral:      TOKENS.light.neutral,
  neutralBg:    TOKENS.light.neutralBg,
  cardBg:       TOKENS.light.surface,
  heroText:     TOKENS.light.text,
  accent:       TOKENS.light.accent,
  positive:     TOKENS.light.positive,
  negative:     TOKENS.light.negative,
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

/**
 * Returns the inline <style> block that drives the dark mode overrides.
 * The light palette is the inline fallback applied to every element directly,
 * so when this <style> is stripped by an email client, the email still
 * renders correctly in light mode.
 */
function buildThemeStyleBlock() {
  const D = TOKENS.dark;
  // Class-based overrides for clients that respect prefers-color-scheme.
  // Outlook.com web dark mode honors [data-ogsc] / [data-ogsb] selectors
  // for foreground/background overrides. We mirror the dark rules so
  // Outlook's automatic invert uses our palette instead.
  return `<style>
  /* OpenClaw email theming — see docs/email-dashboard-light-dark-spec.md */
  body, table, td, p, div, h1, h2, h3, h4, span, a {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  table { mso-table-lspace: 0; mso-table-rspace: 0; }
  img { border: 0; line-height: 100%; outline: none; text-decoration: none; }

  /* Default (light) — inline styles already cover this; defined here so
     that "data-ogsc" and dark @media can flip cleanly. */
  .t-page         { background-color: ${TOKENS.light.bg} !important; }
  .t-shell        { background-color: ${TOKENS.light.surface} !important; border-color: ${TOKENS.light.line} !important; }
  .t-surface      { background-color: ${TOKENS.light.surface} !important; }
  .t-surface-alt  { background-color: ${TOKENS.light.surfaceAlt} !important; }
  .t-card         { background-color: ${TOKENS.light.surface} !important; border-color: ${TOKENS.light.line} !important; }
  .t-text         { color: ${TOKENS.light.text} !important; }
  .t-muted        { color: ${TOKENS.light.muted} !important; }
  .t-subtle       { color: ${TOKENS.light.subtle} !important; }
  .t-line         { border-color: ${TOKENS.light.line} !important; }
  .t-line-strong  { border-color: ${TOKENS.light.lineStrong} !important; }
  .t-accent       { color: ${TOKENS.light.accent} !important; }
  .t-pos          { color: ${TOKENS.light.positive} !important; }
  .t-neg          { color: ${TOKENS.light.negative} !important; }

  @media (prefers-color-scheme: dark) {
    .t-page         { background-color: ${D.bg} !important; }
    .t-shell        { background-color: ${D.surface} !important; border-color: ${D.line} !important; }
    .t-surface      { background-color: ${D.surface} !important; }
    .t-surface-alt  { background-color: ${D.surfaceAlt} !important; }
    .t-card         { background-color: ${D.surface} !important; border-color: ${D.line} !important; }
    .t-text         { color: ${D.text} !important; }
    .t-muted        { color: ${D.muted} !important; }
    .t-subtle       { color: ${D.subtle} !important; }
    .t-line         { border-color: ${D.line} !important; }
    .t-line-strong  { border-color: ${D.lineStrong} !important; }
    .t-accent       { color: ${D.accent} !important; }
    .t-pos          { color: ${D.positive} !important; }
    .t-neg          { color: ${D.negative} !important; }
    .t-badge-info     { color: ${D.info} !important; background-color: ${D.infoBg} !important; }
    .t-badge-warn     { color: ${D.warn} !important; background-color: ${D.warnBg} !important; }
    .t-badge-success  { color: ${D.success} !important; background-color: ${D.successBg} !important; }
    .t-badge-danger   { color: ${D.danger} !important; background-color: ${D.dangerBg} !important; }
    .t-badge-neutral  { color: ${D.neutral} !important; background-color: ${D.neutralBg} !important; }
  }

  /* Outlook.com / Outlook 365 web dark mode hooks. */
  [data-ogsc] .t-page         { background-color: ${D.bg} !important; }
  [data-ogsc] .t-shell        { background-color: ${D.surface} !important; border-color: ${D.line} !important; }
  [data-ogsc] .t-surface      { background-color: ${D.surface} !important; }
  [data-ogsc] .t-surface-alt  { background-color: ${D.surfaceAlt} !important; }
  [data-ogsc] .t-card         { background-color: ${D.surface} !important; border-color: ${D.line} !important; }
  [data-ogsc] .t-text         { color: ${D.text} !important; }
  [data-ogsc] .t-muted        { color: ${D.muted} !important; }
  [data-ogsc] .t-subtle       { color: ${D.subtle} !important; }
  [data-ogsc] .t-pos          { color: ${D.positive} !important; }
  [data-ogsc] .t-neg          { color: ${D.negative} !important; }
  [data-ogsc] .t-accent       { color: ${D.accent} !important; }
  [data-ogsb] .t-page         { background-color: ${D.bg} !important; }
  [data-ogsb] .t-shell        { background-color: ${D.surface} !important; }
  [data-ogsb] .t-surface      { background-color: ${D.surface} !important; }
  [data-ogsb] .t-surface-alt  { background-color: ${D.surfaceAlt} !important; }
  [data-ogsb] .t-card         { background-color: ${D.surface} !important; }

  @media only screen and (max-width: 600px) {
    .t-shell { border-radius: 14px !important; }
    .t-pad-md { padding: 18px !important; }
  }
</style>`;
}

/**
 * Top-level page wrapper. The new design replaces the dark gradient hero
 * with a clean eyebrow + heading section that lives on the same surface
 * as the cards, separated by spacing and a thin hairline.
 *
 * The `accent` parameter is accepted for backward compatibility but no longer
 * controls a gradient background.
 */
function page({ eyebrow = 'OpenClaw Portfolio Manager', title, subtitle = '', accent, bodyHtml, footer = 'OpenClaw Portfolio Manager' }) {
  void accent; // accepted for backward compat; not used in the lighter design
  const L = TOKENS.light;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(title)}</title>
  ${buildThemeStyleBlock()}
</head>
<body class="t-page t-text" style="margin:0;padding:24px 16px;background-color:${L.bg};color:${L.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div class="t-shell" style="max-width:720px;margin:0 auto;background-color:${L.surface};border-radius:18px;overflow:hidden;border:1px solid ${L.line};box-shadow:0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06);">
    <div class="t-pad-md" style="padding:28px 28px 22px;">
      <div class="t-subtle" style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${L.subtle};font-weight:700;">${escapeHtml(eyebrow)}</div>
      <h1 class="t-text" style="margin:8px 0 0;font-size:24px;line-height:1.2;color:${L.text};font-weight:700;letter-spacing:-0.01em;">${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="t-muted" style="margin:8px 0 0;font-size:14px;line-height:1.55;color:${L.muted};max-width:560px;">${escapeHtml(subtitle)}</p>` : ''}
    </div>
    <div class="t-line" style="border-top:1px solid ${L.line};"></div>
    <div class="t-pad-md" style="padding:22px 28px;">${bodyHtml}</div>
    <div class="t-surface-alt t-subtle" style="padding:16px 22px;background-color:${L.surfaceAlt};border-top:1px solid ${L.line};font-size:12px;color:${L.subtle};text-align:center;line-height:1.6;">${escapeHtml(footer)}</div>
  </div>
</body>
</html>`;
}

function card({ title = '', contentHtml, tone = 'default' }) {
  const L = TOKENS.light;
  // tones now subtle-only (no large tinted blocks). Tinted "info/warn/success/danger"
  // tones are still respected, but use much softer fills.
  const tones = {
    default: { bg: L.surface,    border: L.line,        title: L.text },
    surface: { bg: L.surface,    border: L.line,        title: L.text },
    info:    { bg: L.infoBg,     border: L.line,        title: L.text },
    warn:    { bg: L.warnBg,     border: L.line,        title: L.text },
    success: { bg: L.successBg,  border: L.line,        title: L.text },
    danger:  { bg: L.dangerBg,   border: L.line,        title: L.text },
  };
  const chosen = tones[tone] || tones.default;
  return `<section class="t-card t-text" style="margin:0 0 14px;padding:18px 18px;background-color:${chosen.bg};border:1px solid ${chosen.border};border-radius:14px;">
    ${title ? `<h2 class="t-text" style="margin:0 0 12px;font-size:14px;line-height:1.35;color:${chosen.title};font-weight:700;letter-spacing:-0.005em;text-transform:uppercase;letter-spacing:0.06em;">${escapeHtml(title)}</h2>` : ''}
    ${contentHtml}
  </section>`;
}

function badge({ label, tone = 'info' }) {
  const L = TOKENS.light;
  const tones = {
    success:  { fg: L.success,  bg: L.successBg,  cls: 't-badge-success' },
    danger:   { fg: L.danger,   bg: L.dangerBg,   cls: 't-badge-danger'  },
    warn:     { fg: L.warn,     bg: L.warnBg,    cls: 't-badge-warn'    },
    info:     { fg: L.info,     bg: L.infoBg,     cls: 't-badge-info'    },
    neutral:  { fg: L.neutral,  bg: L.neutralBg,  cls: 't-badge-neutral' },
  };
  const chosen = tones[tone] || tones.info;
  return `<span class="${chosen.cls}" style="display:inline-flex;align-items:center;min-height:24px;padding:4px 10px;border-radius:999px;background-color:${chosen.bg};color:${chosen.fg};font-size:11px;font-weight:700;letter-spacing:0.02em;line-height:1.2;box-sizing:border-box;vertical-align:top;">${escapeHtml(label)}</span>`;
}

function metricGrid(items) {
  const L = TOKENS.light;
  const cells = items.map((item) => `<div class="t-card t-text" style="display:inline-block;vertical-align:top;width:calc(50% - 10px);min-width:200px;box-sizing:border-box;margin:0 10px 10px 0;background-color:${L.surface};border:1px solid ${L.line};border-radius:12px;padding:16px 16px 14px;">
    <div class="t-subtle" style="font-size:11px;color:${L.subtle};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">${escapeHtml(item.label)}</div>
    <div class="t-text" style="font-size:22px;line-height:1.2;font-weight:700;color:${L.text};word-break:break-word;letter-spacing:-0.015em;">${escapeHtml(item.value)}</div>
    ${item.detail ? `<div class="t-muted" style="margin-top:6px;font-size:12px;line-height:1.5;color:${L.muted};">${escapeHtml(item.detail)}</div>` : ''}
  </div>`).join('');
  return `<div style="font-size:0;">${cells}</div>`;
}

function kvTable(rows) {
  const L = TOKENS.light;
  return `<table style="width:100%;border-collapse:collapse;">${rows.map((row) => `<tr>
    <td class="t-muted t-line" style="padding:8px 0;color:${L.muted};vertical-align:top;width:38%;font-size:13px;line-height:1.5;border-bottom:1px solid ${L.line};">${escapeHtml(row.label)}</td>
    <td class="t-text t-line" style="padding:8px 0;color:${L.text};font-weight:600;vertical-align:top;font-size:14px;line-height:1.55;border-bottom:1px solid ${L.line};">${row.htmlValue || escapeHtml(row.value)}</td>
  </tr>`).join('')}</table>`;
}

function dataTable({ columns, rows }) {
  const L = TOKENS.light;
  const header = `<tr class="t-surface-alt" style="background-color:${L.surfaceAlt};">${columns.map((column) => `<th class="t-subtle t-line-strong" style="padding:10px 10px;text-align:${column.align || 'left'};border-bottom:1px solid ${L.lineStrong};font-size:11px;color:${L.subtle};text-transform:uppercase;letter-spacing:0.08em;line-height:1.3;font-weight:700;">${escapeHtml(column.label)}</th>`).join('')}</tr>`;
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((cell, index) => `<td class="t-text t-line" style="padding:10px 10px;border-bottom:1px solid ${L.line};text-align:${columns[index].align || 'left'};font-size:13px;line-height:1.45;color:${L.text};vertical-align:top;word-break:break-word;">${cell}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${columns.length}" class="t-muted" style="padding:14px 10px;color:${L.muted};font-style:italic;font-size:13px;">No items.</td></tr>`;
  return `<div style="overflow-x:auto;"><table class="t-surface" style="width:100%;border-collapse:collapse;background-color:${L.surface};border:1px solid ${L.line};border-radius:12px;overflow:hidden;">${header}${body}</table></div>`;
}

function bulletList(items) {
  const L = TOKENS.light;
  if (!items.length) return `<p class="t-muted" style="margin:0;color:${L.muted};line-height:1.6;">No items.</p>`;
  return `<ul class="t-text" style="margin:0;padding-left:18px;color:${L.text};">${items.map((item) => `<li style="margin:0 0 8px;line-height:1.55;">${escapeHtml(item)}</li>`).join('')}</ul>`;
}

module.exports = {
  BRAND,
  TOKENS,
  buildThemeStyleBlock,
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
