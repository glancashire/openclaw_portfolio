const path = require('path');
const { loadPortfolioDocument, validatePortfolioDocument } = require('../src/markdown/portfolioMarkdown');

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('Usage: node scripts/validate-portfolio.js <portfolio.md> [more files...]');
  process.exit(1);
}

let hasErrors = false;
for (const target of targets) {
  const resolved = path.resolve(target);
  const doc = loadPortfolioDocument(resolved);
  const issues = validatePortfolioDocument(doc, target);
  if (issues.length === 0) {
    console.log(`OK  ${target}  (${doc.title || 'untitled'})`);
    continue;
  }

  console.log(`ISSUES  ${target}  (${doc.title || 'untitled'})`);
  for (const issue of issues) {
    console.log(`- [${issue.severity}] ${issue.message}`);
    if (issue.severity === 'error') hasErrors = true;
  }
}

process.exit(hasErrors ? 1 : 0);
