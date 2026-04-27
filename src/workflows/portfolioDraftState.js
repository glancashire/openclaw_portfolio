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

function approvedInstrumentsAnswered(text) {
  const section = extractSection(text, 'Approved Instruments');
  const rows = section.split(/\r?\n/).filter((line) => line.startsWith('|') && !line.includes('---') && !line.includes('Ticker / ISIN'));
  return rows.some((line) => !line.includes('<') && line.replace(/[|\s]/g, '').length > 0);
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

function collectDraftState(filePath) {
  const text = read(filePath);
  return {
    portfolioName: (text.match(/^# Portfolio:\s*(.+)$/m) || [null, null])[1],
    broker: extractLineValue(text, 'Broker'),
    brokerAccountReference: extractLineValue(text, 'Broker account reference'),
    baseCurrency: extractLineValue(text, 'Base currency'),
    initialCapital: notesContain(text, 'Confirm initial capital and expected portfolio size.') ? null : 'provided',
    investmentHorizon: extractLineValue(text, 'Investment horizon'),
    riskLevel: extractLineValue(text, 'Risk level'),
    maximumAcceptableDrawdown: extractLineValue(text, 'Maximum acceptable drawdown'),
    targetAssetClasses: extractSection(text, 'Allocation Targets').includes('| Global equities |') ? 'present' : null,
    geographicPreferences: extractSection(text, 'Geographic Targets').includes('| Switzerland |') ? 'present' : null,
    sectorPreferences: extractSection(text, 'Industry / Sector Constraints').includes('| Technology |') ? 'present' : null,
    esgPreference: extractLineValue(text, 'ESG preference'),
    issuerPreferences: approvedInstrumentsAnswered(text) ? 'provided' : null,
    rebalancingTolerance: extractLineValue(text, 'Rebalance threshold'),
    automatedExecutionAllowed: extractLineValue(text, 'Execute trades automatically'),
    stagedMarketEntryDesired: extractLineValue(text, 'Initial deployment mode'),
    excludedInstruments: extractSection(text, 'Excluded Instruments').includes('|') ? 'present' : null,
    alreadyHeldInstruments: notesContain(text, 'Confirm any excluded or already-held instruments.') ? null : 'provided',
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
