const fs = require('fs');

const VALID_STATUSES = new Set(['draft', 'active', 'paused', 'archived']);
const VALID_EXECUTION_MODES = new Set(['propose_only', 'require_confirmation', 'auto_trade_limited', 'auto_trade_full', 'transmitted_live']);
const VALID_RISK_LEVELS = new Set(['low', 'medium', 'high']);

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function extractStatusValue(text, label) {
  const re = new RegExp(`- ${label}:\\s*(.+)`);
  const match = text.match(re);
  return match ? match[1].trim() : null;
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

function parseMarkdownTable(sectionText) {
  const lines = sectionText.split(/\r?\n/).filter(Boolean);
  const tableLines = lines.filter((line) => line.trim().startsWith('|'));
  if (tableLines.length < 2) return [];
  const rows = tableLines.slice(2);
  return rows.map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

function hasPlaceholder(text) {
  return /<[^>]+>|YYYY-MM-DD|YYYY-MM-DD HH:mm:ss/.test(text);
}

function parseNumber(value) {
  const cleaned = String(value).replace(/[% ,]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function validateAllocationRows(rows, label, issues, filePath) {
  let total = 0;
  let numericRows = 0;
  for (const row of rows) {
    const target = parseNumber(row[1]);
    const min = parseNumber(row[2]);
    const max = parseNumber(row[3]);
    if (target == null || min == null || max == null) continue;
    numericRows += 1;
    total += target;
    if (!(min <= target && target <= max)) {
      issues.push({ severity: 'error', filePath, message: `${label} row invalid min/target/max ordering: ${row[0]}` });
    }
    if (min < 0 || max > 100 || target < 0 || target > 100) {
      issues.push({ severity: 'error', filePath, message: `${label} row out of 0-100 range: ${row[0]}` });
    }
  }
  if (numericRows > 0 && Math.abs(total - 100) > 0.01) {
    issues.push({ severity: 'warning', filePath, message: `${label} target totals sum to ${total}, not 100.` });
  }
}

function validatePortfolioStrategy(filePath) {
  const text = read(filePath);
  const issues = [];

  const status = extractStatusValue(text, 'Status');
  const executionMode = extractStatusValue(text, 'Execution mode');
  const riskLevel = extractStatusValue(text, 'Risk level');
  const baseCurrency = extractStatusValue(text, 'Base currency');
  const broker = extractStatusValue(text, 'Broker');

  if (status && !VALID_STATUSES.has(status)) {
    issues.push({ severity: 'error', filePath, message: `Invalid portfolio status: ${status}` });
  }
  if (executionMode && !VALID_EXECUTION_MODES.has(executionMode)) {
    issues.push({ severity: 'error', filePath, message: `Invalid execution mode: ${executionMode}` });
  }
  if (riskLevel && !riskLevel.startsWith('<') && !VALID_RISK_LEVELS.has(riskLevel)) {
    issues.push({ severity: 'error', filePath, message: `Invalid risk level: ${riskLevel}` });
  }
  if (baseCurrency && baseCurrency !== 'CHF') {
    issues.push({ severity: 'warning', filePath, message: `Base currency is ${baseCurrency}; MVP is CHF-first.` });
  }
  if (broker && broker !== 'interactive-brokers') {
    issues.push({ severity: 'warning', filePath, message: `Broker is ${broker}; current implementation support is focused on Interactive Brokers only.` });
  }

  const allocationRows = parseMarkdownTable(extractSection(text, 'Allocation Targets'));
  const geoRows = parseMarkdownTable(extractSection(text, 'Geographic Targets'));
  const approvedRows = parseMarkdownTable(extractSection(text, 'Approved Instruments'));

  validateAllocationRows(allocationRows, 'Allocation Targets', issues, filePath);
  validateAllocationRows(geoRows, 'Geographic Targets', issues, filePath);

  const riskSection = extractSection(text, 'Risk Limits');
  if (riskSection && hasPlaceholder(riskSection)) {
    issues.push({ severity: 'warning', filePath, message: 'Risk Limits still contain placeholders.' });
  }

  if (status === 'active') {
    if (hasPlaceholder(text)) {
      issues.push({ severity: 'error', filePath, message: 'Active portfolio still contains unresolved placeholders.' });
    }
    const meaningfulApproved = approvedRows.filter((row) => row.some((cell) => cell && !cell.startsWith('<')));
    if (meaningfulApproved.length === 0) {
      issues.push({ severity: 'error', filePath, message: 'Active portfolio has no approved instruments.' });
    }
  }

  if (status === 'draft' && hasPlaceholder(text)) {
    issues.push({ severity: 'info', filePath, message: 'Draft portfolio contains unresolved placeholders, which is expected until onboarding is complete.' });
  }

  return issues;
}

module.exports = { validatePortfolioStrategy };
