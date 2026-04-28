const fs = require('fs');
const path = require('path');

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
  return pdfPath;
}

module.exports = { markdownReportToPdfStub };
