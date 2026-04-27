const fs = require('fs');
const { readApprovedInstruments } = require('../analysis/approvedInstruments');
const { VALID_ASSET_CLASSES } = require('./approvedInstrumentValidation');

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

function parseRows(section) {
  return section
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

function parseNumber(value) {
  const cleaned = String(value || '').replace(/[% ,]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function validatePortfolioConsistency(portfolioPath) {
  const text = fs.readFileSync(portfolioPath, 'utf8');
  const issues = [];
  const allocationRows = parseRows(extractSection(text, 'Allocation Targets'));
  const geoRows = parseRows(extractSection(text, 'Geographic Targets'));
  const instruments = readApprovedInstruments(portfolioPath);

  const requiredAssetClasses = allocationRows.map((row) => row[0]).filter(Boolean);
  const covered = new Set(instruments.map((i) => i.assetClass).filter((v) => VALID_ASSET_CLASSES.has(v)));
  for (const assetClass of requiredAssetClasses) {
    if (!covered.has(assetClass)) {
      issues.push({ severity: 'warning', filePath: portfolioPath, message: `No approved instrument currently covers target asset class: ${assetClass}` });
    }
  }

  for (const row of geoRows) {
    const region = row[0];
    const target = parseNumber(row[1]);
    const min = parseNumber(row[2]);
    const max = parseNumber(row[3]);
    if (target == null || min == null || max == null) continue;
    if (!(min <= target && target <= max)) {
      issues.push({ severity: 'error', filePath: portfolioPath, message: `Geographic target row has invalid min/target/max ordering: ${region}` });
    }
  }

  const geoTotal = geoRows.reduce((sum, row) => sum + (parseNumber(row[1]) || 0), 0);
  if (Math.abs(geoTotal - 100) > 0.01) {
    issues.push({ severity: 'warning', filePath: portfolioPath, message: `Geographic target totals sum to ${geoTotal}, not 100.` });
  }

  return issues;
}

module.exports = { validatePortfolioConsistency };
