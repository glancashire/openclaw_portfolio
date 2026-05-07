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
body { font-family: Arial, sans-serif; margin: 32px; color: #111; }
h1, h2, h3 { margin-top: 24px; }
p, li { line-height: 1.4; }
pre { white-space: pre-wrap; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 12px; }
code { font-family: monospace; }
</style>
</head>
<body>
${html}
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
