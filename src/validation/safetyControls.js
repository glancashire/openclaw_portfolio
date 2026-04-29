const fs = require('fs');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function hasOpenQuestions(portfolioText) {
  const sectionMatch = portfolioText.match(/## Notes \/ Open Questions([\s\S]*)$/);
  if (!sectionMatch) return false;
  const body = sectionMatch[1];
  return /-\s+/.test(body.trim());
}

function extractExecutionMode(portfolioText) {
  const match = portfolioText.match(/- Execution mode:\s*(.+)/);
  return match ? match[1].trim() : null;
}

function extractRiskLimit(portfolioText, label) {
  const match = portfolioText.match(new RegExp(`- ${label}:\\s*(.+)`));
  return match ? match[1].trim() : null;
}

function evaluateSafetyControls({ portfolioPath, holdingsPath }) {
  const portfolioText = read(portfolioPath);
  const holdingsText = read(holdingsPath);
  const blockers = [];

  if (hasOpenQuestions(portfolioText)) {
    blockers.push({ severity: 'warning', message: 'Portfolio still has open questions; do not trade live yet.' });
  }
  if (/Unmatched holdings: (?!none)/.test(holdingsText)) {
    blockers.push({ severity: 'error', message: 'Holdings contain unmatched instruments.' });
  }
  if (/Pricing source: simulated/.test(holdingsText)) {
    blockers.push({ severity: 'warning', message: 'Holdings and pricing are still simulated.' });
  }
  const executionMode = extractExecutionMode(portfolioText);
  if (executionMode && executionMode !== 'require_confirmation' && executionMode !== 'propose_only') {
    blockers.push({ severity: 'warning', message: `Execution mode is ${executionMode}; MVP should stay confirmation-gated until broker validation is complete.` });
  }
  for (const label of ['Max single ETF allocation', 'Max single issuer allocation', 'Max cash drag after full deployment']) {
    const value = extractRiskLimit(portfolioText, label);
    if (!value || value.includes('<')) {
      blockers.push({ severity: 'error', message: `Missing concrete risk limit: ${label}.` });
    }
  }

  return blockers;
}

module.exports = { evaluateSafetyControls };
