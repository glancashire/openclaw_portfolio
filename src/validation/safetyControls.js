const fs = require('fs');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function includesSimulatedPricing(holdingsText) {
  return /Pricing source:\s*simulated/i.test(holdingsText) || /Simulated pricing assumptions/i.test(holdingsText);
}

function includesStalePricing(holdingsText) {
  return /Pricing source:\s*stale/i.test(holdingsText) || /Warnings:\s*[\s\S]*stale price/i.test(holdingsText);
}

function hasOpenQuestions(portfolioText) {
  const sectionMatch = portfolioText.match(/## Notes \/ Open Questions([\s\S]*)$/);
  if (!sectionMatch) return false;
  const body = sectionMatch[1];
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .some((line) => /\?|confirm|todo|tbd|resolve|decide|open question/i.test(line));
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
    blockers.push({ severity: 'error', message: 'Portfolio still has open questions; trade execution must remain blocked.' });
  }
  if (/Unmatched holdings: (?!none)/.test(holdingsText)) {
    blockers.push({ severity: 'error', message: 'Holdings contain unmatched instruments.' });
  }
  if (includesSimulatedPricing(holdingsText)) {
    blockers.push({ severity: 'error', message: 'Holdings and pricing are still simulated.' });
  }
  if (includesStalePricing(holdingsText)) {
    blockers.push({ severity: 'error', message: 'Holdings pricing is stale.' });
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

module.exports = { evaluateSafetyControls, hasOpenQuestions, includesSimulatedPricing, includesStalePricing };
