const fs = require('fs');
const path = require('path');
const assert = require('assert');

(function main() {
  const digestDocPath = path.join(process.cwd(), 'docs', 'email-digest.md');
  const setupDocPath = path.join(process.cwd(), 'docs', 'setup', 'daily-digest.md');
  const digest = fs.readFileSync(digestDocPath, 'utf8');
  const setup = fs.readFileSync(setupDocPath, 'utf8');

  const digestRequired = [
    '# Email Digest',
    'scripts/send-dashboard-digest.js',
    'collectPortfolioSummary()',
    'buildReportEmailHtml()',
    'buildReportEmailText()',
    'Portfolio Value Snapshot',
    'Profit / Loss',
    'The digest CLI always writes JSON to stdout.',
    'does **not** use the older multi-card `src/reporting/dashboardDigest.js` renderer',
  ];

  for (const line of digestRequired) {
    assert(digest.includes(line), `Expected email digest doc to include: ${line}`);
  }

  const setupRequired = [
    '# Daily monitoring digest',
    'scripts/send-dashboard-digest.js',
    'stdout is JSON',
    'It no longer uses the older `src/reporting/dashboardDigest.js` renderer on the active send surface.',
  ];

  for (const line of setupRequired) {
    assert(setup.includes(line), `Expected daily digest setup doc to include: ${line}`);
  }

  console.log(JSON.stringify({ ok: true, digestRequired: digestRequired.length, setupRequired: setupRequired.length }, null, 2));
})();
