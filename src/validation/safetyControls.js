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

function parsePct(value) {
  const cleaned = String(value || '').replace(/[^0-9.-]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function findMaxObservedWeightPct(holdingsText) {
  const lines = holdingsText.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.includes('| Allocation % |') || line.includes('| Weight % |'));
  if (headerIndex === -1) return null;
  const headerCells = lines[headerIndex].split('|').slice(1, -1).map((cell) => cell.trim());
  const weightIndex = headerCells.findIndex((cell) => cell === 'Allocation %' || cell === 'Weight %');
  if (weightIndex === -1) return null;
  let max = null;
  for (let i = headerIndex + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith('|')) break;
    if (line.includes('|---|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    const weight = parsePct(cells[weightIndex] || '');
    if (weight == null) continue;
    if (max == null || weight > max) max = weight;
  }
  return max;
}

function evaluateSafetyControls({ portfolioPath, holdingsPath }) {
  const portfolioText = read(portfolioPath);
  const holdingsText = read(holdingsPath);
  const blockers = [];

  if (hasOpenQuestions(portfolioText)) {
    blockers.push({ severity: 'error', message: 'Portfolio still has open questions; trade execution must remain blocked.' });
  }
  const unmatchedMatch = holdingsText.match(/- Unmatched holdings:\s*(.+)/i);
  if (unmatchedMatch && !/^none$/i.test(unmatchedMatch[1].trim())) {
    blockers.push({ severity: 'error', message: `Holdings contain unmatched instruments: ${unmatchedMatch[1].trim()}` });
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

  const maxSingleEtf = parsePct(extractRiskLimit(portfolioText, 'Max single ETF allocation'));
  const observedMaxWeight = findMaxObservedWeightPct(holdingsText);
  if (maxSingleEtf != null && observedMaxWeight != null && observedMaxWeight > maxSingleEtf + 0.001) {
    blockers.push({ severity: 'error', message: `Current holdings exceed max single ETF allocation (${observedMaxWeight}% > ${maxSingleEtf}%).` });
  }

  return blockers;
}

module.exports = { evaluateSafetyControls, hasOpenQuestions, includesSimulatedPricing, includesStalePricing, findMaxObservedWeightPct };
