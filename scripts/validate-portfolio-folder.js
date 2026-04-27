const fs = require('fs');
const path = require('path');
const { validateFileContract } = require('../src/markdown/validateFileContract');
const { loadPortfolioDocument, validatePortfolioDocument } = require('../src/markdown/portfolioMarkdown');
const { validatePortfolioStrategy } = require('../src/validation/strategyValidation');

const folder = process.argv[2];
if (!folder) {
  console.error('Usage: node scripts/validate-portfolio-folder.js <portfolio-folder>');
  process.exit(1);
}

const requiredFiles = ['portfolio.md', 'holdings.md', 'trades.md', 'history.md', 'dashboard.md'];
let hasErrors = false;

for (const name of requiredFiles) {
  const filePath = path.join(folder, name);
  if (!fs.existsSync(filePath)) {
    console.log(`- [error] Missing file: ${filePath}`);
    hasErrors = true;
    continue;
  }

  let issues = validateFileContract(filePath);
  if (name === 'portfolio.md') {
    const doc = loadPortfolioDocument(filePath);
    issues = issues.concat(validatePortfolioDocument(doc, filePath));
    issues = issues.concat(validatePortfolioStrategy(filePath));
  }

  if (issues.length === 0) {
    console.log(`OK  ${filePath}`);
    continue;
  }

  console.log(`ISSUES  ${filePath}`);
  for (const issue of issues) {
    console.log(`- [${issue.severity}] ${issue.message}`);
    if (issue.severity === 'error') hasErrors = true;
  }
}

process.exit(hasErrors ? 1 : 0);
