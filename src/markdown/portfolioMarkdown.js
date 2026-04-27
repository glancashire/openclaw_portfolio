const fs = require('fs');
const path = require('path');
const { REQUIRED_SECTIONS, REQUIRED_STATUS_LINES } = require('./portfolioContract');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parsePortfolioMarkdown(text) {
  const lines = text.split(/\r?\n/);
  const titleLine = lines.find((line) => line.startsWith('# Portfolio:')) || '';
  const title = titleLine.replace(/^# Portfolio:\s*/, '').trim();

  const sections = {};
  let current = null;
  for (const line of lines) {
    const match = line.match(/^##\s+(.*)$/);
    if (match) {
      current = match[1].trim();
      sections[current] = [];
      continue;
    }
    if (current) sections[current].push(line);
  }

  return { title, sections, raw: text };
}

function validatePortfolioDocument(doc, filePath = '<memory>') {
  const issues = [];

  if (!doc.title) {
    issues.push({ severity: 'error', filePath, message: 'Missing `# Portfolio: <name>` title.' });
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!Object.prototype.hasOwnProperty.call(doc.sections, section)) {
      issues.push({ severity: 'error', filePath, message: `Missing required section: ${section}` });
    }
  }

  const statusLines = doc.sections['Status'] || [];
  for (const required of REQUIRED_STATUS_LINES) {
    if (!statusLines.some((line) => line.includes(required))) {
      issues.push({ severity: 'error', filePath, message: `Status section missing line containing: ${required}` });
    }
  }

  const raw = doc.raw;
  if (!raw.includes('| Asset class | Target % | Min % | Max % | Notes |')) {
    issues.push({ severity: 'error', filePath, message: 'Missing Allocation Targets table header.' });
  }
  if (!raw.includes('| Region | Target % | Min % | Max % |')) {
    issues.push({ severity: 'error', filePath, message: 'Missing Geographic Targets table header.' });
  }
  if (!raw.includes('| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |')) {
    issues.push({ severity: 'error', filePath, message: 'Missing Approved Instruments table header.' });
  }
  if (!raw.includes('| Ticker / ISIN | Reason |')) {
    issues.push({ severity: 'error', filePath, message: 'Missing Excluded Instruments table header.' });
  }

  const lower = raw.toLowerCase();
  const forbidden = ['api key:', 'apikey:', 'password:', 'secret:', 'token:'];
  for (const marker of forbidden) {
    if (lower.includes(marker)) {
      issues.push({ severity: 'warning', filePath, message: `Potential secret-like marker found: ${marker}` });
    }
  }

  return issues;
}

function loadPortfolioDocument(filePath) {
  const resolved = path.resolve(filePath);
  const text = readText(resolved);
  return parsePortfolioMarkdown(text);
}

module.exports = {
  readText,
  parsePortfolioMarkdown,
  validatePortfolioDocument,
  loadPortfolioDocument,
};
