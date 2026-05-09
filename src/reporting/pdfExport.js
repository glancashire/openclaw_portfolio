const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function markdownReportToPdfStub(markdownPath) {
  const pdfPath = markdownPath.replace(/\.md$/i, '.pdf');
  const markdownName = path.basename(markdownPath);
  const stub = [
    `PDF export placeholder for ${markdownName}`,
    '',
    'This file marks the intended PDF output path for the portfolio-manager MVP.',
    'A real PDF renderer is not wired yet.',
    'Until then, treat the paired Markdown report as the source of truth.',
    '',
    `Generated: ${new Date().toISOString()}`,
  ].join('\n');
  fs.writeFileSync(pdfPath, stub);
  return { pdfPath, mode: 'stub' };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdownTable(block) {
  const lines = block.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return `<p>${lines.map(escapeHtml).join('<br/>')}</p>`;
  const rows = lines
    .filter((line) => /^\|.*\|$/.test(line.trim()))
    .map((line) => line.split('|').slice(1, -1).map((cell) => escapeHtml(cell.trim())));
  if (rows.length < 2) return `<p>${lines.map(escapeHtml).join('<br/>')}</p>`;
  const header = rows[0];
  const bodyRows = rows.slice(2);
  const thead = `<thead><tr>${header.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead>`;
  const tbody = bodyRows.length
    ? `<tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>`
    : '';
  return `<table>${thead}${tbody}</table>`;
}

function markdownToBasicHtml(markdown) {
  const normalized = String(markdown)
    .replace(/^###\s+(.*)$/gm, '### $1\n\n')
    .replace(/^##\s+(.*)$/gm, '## $1\n\n')
    .replace(/^#\s+(.*)$/gm, '# $1\n\n')
    .replace(/\n{3,}/g, '\n\n');
  const blocks = normalized.split(/\n\n+/);
  const html = blocks.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^###\s+[^\n]+$/.test(trimmed)) return `<h3>${escapeHtml(trimmed.replace(/^###\s+/, ''))}</h3>`;
    if (/^##\s+[^\n]+$/.test(trimmed)) return `<h2>${escapeHtml(trimmed.replace(/^##\s+/, ''))}</h2>`;
    if (/^#\s+[^\n]+$/.test(trimmed)) return `<h1>${escapeHtml(trimmed.replace(/^#\s+/, ''))}</h1>`;
    if (/^(?:- .*(?:\n|$))+/.test(trimmed)) {
      const items = trimmed.split(/\r?\n/).filter((line) => line.startsWith('- '));
      return `<ul>${items.map((line) => `<li>${escapeHtml(line.slice(2))}</li>`).join('')}</ul>`;
    }
    if (/^\|.*\|(?:\n\|.*\|)+$/m.test(trimmed)) return renderMarkdownTable(trimmed);
    if (/^(?:\d+\. .*(?:\n|$))+/.test(trimmed)) {
      const items = trimmed.split(/\r?\n/).filter((line) => /^\d+\. /.test(line));
      return `<ol>${items.map((line) => `<li>${escapeHtml(line.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`;
    }
    return `<p>${trimmed.split(/\r?\n/).map(escapeHtml).join('<br/>')}</p>`;
  }).filter(Boolean).join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Portfolio Report</title>
<style>
:root {
  --color-healthy: #16a34a;
  --color-warning: #d97706;
  --color-blocked: #dc2626;
  --color-info: #2563eb;
  --color-muted: #6b7280;
  --color-bg: #fafafa;
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
  --color-text: #1f2937;
  --color-text-secondary: #4b5563;
}
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 32px 40px; color: var(--color-text); background: var(--color-bg); line-height: 1.6; }
.report-container { max-width: 900px; margin: 0 auto; background: var(--color-surface); border-radius: 8px; padding: 32px 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 8px 0; padding-bottom: 12px; border-bottom: 2px solid var(--color-border); }
h2 { font-size: 1.15rem; font-weight: 600; margin: 28px 0 12px 0; color: var(--color-text); }
h3 { font-size: 1rem; font-weight: 600; margin: 20px 0 8px 0; color: var(--color-text-secondary); }
p { margin: 8px 0; color: var(--color-text-secondary); }
ul, ol { margin: 8px 0; padding-left: 24px; }
li { margin: 4px 0; line-height: 1.5; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.85rem; }
th { background: #f3f4f6; font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 2px solid var(--color-border); }
td { padding: 8px 12px; border-bottom: 1px solid var(--color-border); }
tbody tr:nth-child(even) { background: #f9fafb; }
tbody tr:hover { background: #f0f4ff; }
code { font-family: 'SF Mono', Monaco, monospace; font-size: 0.85em; background: #f3f4f6; padding: 2px 5px; border-radius: 3px; }
pre { white-space: pre-wrap; background: #f3f4f6; padding: 12px; border-radius: 6px; font-size: 0.85rem; }
.badge { display: inline-block; font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.03em; }
.badge-healthy { background: #dcfce7; color: var(--color-healthy); }
.badge-warning { background: #fef3c7; color: var(--color-warning); }
.badge-blocked { background: #fee2e2; color: var(--color-blocked); }
.badge-info { background: #dbeafe; color: var(--color-info); }
.meta-bar { font-size: 0.8rem; color: var(--color-muted); margin-bottom: 16px; }
</style>
</head>
<body>
<div class="report-container">
${html}
</div>
</body>
</html>`;
}

function renderPdf(markdownPath) {
  const pdfPath = markdownPath.replace(/\.md$/i, '.pdf');
  const htmlPath = markdownPath.replace(/\.md$/i, '.html');
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const html = markdownToBasicHtml(markdown);
  fs.writeFileSync(htmlPath, html);

  try {
    execFileSync(process.execPath, [path.join(__dirname, '..', '..', 'scripts', 'render-html-pdf.js'), htmlPath, pdfPath], { stdio: 'pipe' });
    return { pdfPath, htmlPath, mode: 'rendered' };
  } catch {
    return markdownReportToPdfStub(markdownPath);
  }
}

module.exports = { markdownReportToPdfStub, markdownToBasicHtml, renderPdf };
