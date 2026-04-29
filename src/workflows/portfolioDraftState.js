const fs = require('fs');
const { QUESTION_FIELDS } = require('./portfolioQuestions');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractLineValue(text, label) {
  const re = new RegExp(`- ${label}:\\s*(.+)`);
  const match = text.match(re);
  return match ? match[1].trim() : null;
}

function hasPlaceholderValue(value) {
  return !value || value.includes('<') || value.includes('YYYY-MM-DD');
}

function notesContain(text, needle) {
  return text.includes(needle);
}

function extractSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function extractStrategySummary(text) {
  const section = extractSection(text, 'Strategy Summary');
  return section
    .split(/\r?\n/)
    .slice(1)
    .join(' ')
    .trim();
}

function hasNonEmptyDataRow(section, { ignoreValues = [] } = {}) {
  const rows = section
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|') && !line.includes('---'))
    .slice(1);

  return rows.some((line) => {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (!cells.length) return false;
    const meaningfulCells = cells.filter((cell) => cell && !ignoreValues.includes(cell));
    if (!meaningfulCells.length) return false;
    return meaningfulCells.some((cell) => !hasPlaceholderValue(cell));
  });
}

function hasConcreteApprovedInstruments(text) {
  return hasNonEmptyDataRow(extractSection(text, 'Approved Instruments'));
}

function hasConcreteExcludedInstruments(text) {
  return hasNonEmptyDataRow(extractSection(text, 'Excluded Instruments'));
}

function hasMeaningfulTargetTable(text, heading) {
  const section = extractSection(text, heading);
  const rows = section
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|') && !line.includes('---'))
    .slice(1);

  return rows.some((line) => {
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (!cells.length) return false;
    const label = cells[0] || '';
    const metrics = cells.slice(1);
    return label && metrics.some((cell) => !hasPlaceholderValue(cell));
  });
}

function collectDraftState(filePath) {
  const text = read(filePath);
  const strategySummary = extractStrategySummary(text);

  return {
    portfolioName: (text.match(/^# Portfolio:\s*(.+)$/m) || [null, null])[1],
    broker: extractLineValue(text, 'Broker'),
    brokerAccountReference: extractLineValue(text, 'Broker account reference'),
    baseCurrency: extractLineValue(text, 'Base currency'),
    initialCapital: /approximately CHF\s*\d/i.test(strategySummary) ? 'provided' : null,
    investmentHorizon: extractLineValue(text, 'Investment horizon'),
    riskLevel: extractLineValue(text, 'Risk level'),
    maximumAcceptableDrawdown: extractLineValue(text, 'Maximum acceptable drawdown'),
    targetAssetClasses: hasMeaningfulTargetTable(text, 'Allocation Targets') ? 'provided' : null,
    geographicPreferences: hasMeaningfulTargetTable(text, 'Geographic Targets') ? 'provided' : null,
    sectorPreferences: hasMeaningfulTargetTable(text, 'Industry / Sector Constraints') ? 'provided' : null,
    esgPreference: extractLineValue(text, 'ESG preference'),
    issuerPreferences: notesContain(text, 'ETF issuer preferences:') || hasConcreteApprovedInstruments(text) ? 'provided' : null,
    rebalancingTolerance: extractLineValue(text, 'Rebalance threshold'),
    automatedExecutionAllowed: extractLineValue(text, 'Execute trades automatically'),
    stagedMarketEntryDesired: extractLineValue(text, 'Initial deployment mode'),
    excludedInstruments: hasConcreteExcludedInstruments(text) || notesContain(text, 'Excluded instruments') ? 'provided' : null,
    alreadyHeldInstruments: notesContain(text, 'Already-held instruments note:') ? 'provided' : null,
  };
}

function nextQuestions(filePath) {
  const state = collectDraftState(filePath);
  return QUESTION_FIELDS.filter((field) => {
    const value = state[field.key];
    if (value == null) return true;
    if (typeof value === 'string' && hasPlaceholderValue(value)) return true;
    return false;
  });
}

module.exports = { collectDraftState, nextQuestions };
