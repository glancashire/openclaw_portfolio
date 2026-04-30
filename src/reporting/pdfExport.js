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

function markdownToBasicHtml(markdown) {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = escaped
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/\|(.+)\|/g, (line) => line)
    .split(/\n\n+/)
    .map((block) => {
      if (/^<h[1-3]>/.test(block) || /^<ul>/.test(block) || /^\|/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

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
