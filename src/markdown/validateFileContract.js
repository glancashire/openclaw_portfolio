const fs = require('fs');
const path = require('path');
const { CONTRACTS } = require('./fileContracts');

function validateFileContract(filePath) {
  const base = path.basename(filePath);
  const contract = CONTRACTS[base];
  if (!contract) {
    return [{ severity: 'warning', filePath, message: `No contract registered for ${base}` }];
  }

  const text = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  for (const required of contract.requiredStrings) {
    if (!text.includes(required)) {
      issues.push({ severity: 'error', filePath, message: `Missing required content: ${required}` });
    }
  }

  const lower = text.toLowerCase();
  for (const marker of ['api key:', 'apikey:', 'password:', 'secret:', 'token:']) {
    if (lower.includes(marker)) {
      issues.push({ severity: 'warning', filePath, message: `Potential secret-like marker found: ${marker}` });
    }
  }

  return issues;
}

module.exports = { validateFileContract };
