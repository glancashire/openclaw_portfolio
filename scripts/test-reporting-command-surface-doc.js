const fs = require('fs');
const path = require('path');
const assert = require('assert');

(function main() {
  const docPath = path.join(process.cwd(), 'docs', 'reporting-command-surface.md');
  const text = fs.readFileSync(docPath, 'utf8');

  const requiredLines = [
    '# Reporting Command Surface',
    'node scripts/show-dashboard.js [portfolio]',
    'node scripts/regenerate-dashboard.js <portfolio-name-or-dir>',
    'node scripts/generate-report.js <portfolio-dir>',
    'weekly\\|monthly\\|quarterly',
    'node scripts/run-health-check.js <portfolio-dir> [--dry-run] [--send-email]',
    'node scripts/send-dashboard-digest.js --portfolio=<name> --frequency=daily\\|weekly [--dry-run]',
    'node scripts/send-email-verification.js <portfolio-dir> [--to user@example.com]',
    '## Output contract quick guide',
    '## Digest rendering reality',
    'buildReportEmailHtml()',
    'buildReportEmailText()',
    'does **not** use the old multi-card `dashboardDigest.js` path',
    '## Retired local helpers',
    'archive/scripts/legacy-dashboard-email/send-portfolio-dashboard-email.js',
  ];

  for (const line of requiredLines) {
    assert(text.includes(line), `Expected reporting command surface doc to include: ${line}`);
  }

  console.log(JSON.stringify({ ok: true, requiredLines: requiredLines.length }, null, 2));
})();
