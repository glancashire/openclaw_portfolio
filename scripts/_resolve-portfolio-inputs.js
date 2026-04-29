const fs = require('fs');
const path = require('path');

function resolvePortfolioInputs(first, second) {
  if (!first) {
    throw new Error('Missing portfolio input');
  }

  const firstPath = path.resolve(first);
  const stat = fs.existsSync(firstPath) ? fs.statSync(firstPath) : null;
  if (stat?.isDirectory()) {
    return {
      portfolioPath: path.join(firstPath, 'portfolio.md'),
      holdingsPath: path.join(firstPath, 'holdings.md'),
      label: first,
    };
  }

  return {
    portfolioPath: firstPath,
    holdingsPath: second ? path.resolve(second) : path.join(path.dirname(firstPath), 'holdings.md'),
    label: `${path.relative(process.cwd(), firstPath)} | ${path.relative(process.cwd(), second ? path.resolve(second) : path.join(path.dirname(firstPath), 'holdings.md'))}`,
  };
}

module.exports = { resolvePortfolioInputs };
