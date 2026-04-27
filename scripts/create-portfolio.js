const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_DIR = path.join(ROOT, 'portfolio', '_template');
const PORTFOLIO_ROOT = path.join(ROOT, 'portfolio');

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function replaceInFile(filePath, replacements) {
  let text = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }
  fs.writeFileSync(filePath, text);
}

function main() {
  const name = process.argv[2];
  if (!name) {
    throw new Error('Usage: node scripts/create-portfolio.js <portfolio-name>');
  }

  const slug = slugify(name);
  if (!slug) {
    throw new Error('Portfolio name produced an empty slug.');
  }

  const dest = path.join(PORTFOLIO_ROOT, slug);
  if (fs.existsSync(dest)) {
    throw new Error(`Portfolio already exists: ${dest}`);
  }

  copyDir(TEMPLATE_DIR, dest);

  const replacements = [
    ['Template', name],
    ['template', slug],
  ];

  for (const rel of ['portfolio.md', 'holdings.md', 'trades.md', 'history.md', 'dashboard.md']) {
    replaceInFile(path.join(dest, rel), replacements);
  }

  console.log(JSON.stringify({ name, slug, path: path.relative(ROOT, dest) }, null, 2));
}

main();
