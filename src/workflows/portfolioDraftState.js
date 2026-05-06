const fs = require('fs');
const path = require('path');
const { QUESTION_FIELDS } = require('./portfolioQuestions');

const REQUIRED_PORTFOLIO_FILES = ['portfolio.md', 'holdings.md', 'trades.md', 'history.md', 'dashboard.md'];

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
  const section = extractSection(text, 'Excluded Instruments');
  if (/\|\s*none\s*\|\s*none\s*\|/i.test(section)) return true;
  return hasNonEmptyDataRow(section);
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
    automatedExecutionAllowed: extractLineValue(text, 'Generate trade proposals automatically'),
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

function resolvePortfolioDir(targetPath) {
  const resolved = path.resolve(targetPath);
  return path.basename(resolved) === 'portfolio.md' ? path.dirname(resolved) : resolved;
}

function requiredFileStatus(targetPath) {
  const portfolioDir = resolvePortfolioDir(targetPath);
  return REQUIRED_PORTFOLIO_FILES.map((name) => {
    const filePath = path.join(portfolioDir, name);
    return {
      name,
      path: filePath,
      exists: fs.existsSync(filePath),
    };
  });
}

function unresolvedPlaceholderLines(targetPath) {
  const portfolioPath = path.basename(path.resolve(targetPath)) === 'portfolio.md'
    ? path.resolve(targetPath)
    : path.join(path.resolve(targetPath), 'portfolio.md');
  const text = read(portfolioPath);
  return text
    .split(/\r?\n/)
    .filter((line) => /<[^>]+>|YYYY-MM-DD|YYYY-MM-DD HH:mm:ss/.test(line.trim()));
}

function activationReadiness(targetPath) {
  const portfolioPath = path.basename(path.resolve(targetPath)) === 'portfolio.md'
    ? path.resolve(targetPath)
    : path.join(path.resolve(targetPath), 'portfolio.md');
  const questions = nextQuestions(portfolioPath);
  const fileStatus = requiredFileStatus(portfolioPath);
  const missingFiles = fileStatus.filter((item) => !item.exists).map((item) => item.name);
  const placeholders = unresolvedPlaceholderLines(portfolioPath);
  const blockers = [];

  if (missingFiles.length) blockers.push(`Missing required generated files: ${missingFiles.join(', ')}`);
  if (placeholders.length) blockers.push('Unresolved placeholders remain in portfolio.md.');
  if (questions.length) blockers.push(`Unanswered draft questions remain: ${questions.map((q) => q.key).join(', ')}`);

  return {
    ready: blockers.length === 0,
    blockers,
    missingFiles,
    unresolvedPlaceholders: placeholders,
    pendingQuestionKeys: questions.map((q) => q.key),
    requiredFiles: fileStatus,
  };
}

module.exports = {
  REQUIRED_PORTFOLIO_FILES,
  collectDraftState,
  nextQuestions,
  requiredFileStatus,
  unresolvedPlaceholderLines,
  activationReadiness,
};
