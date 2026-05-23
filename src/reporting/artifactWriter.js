const fs = require('fs');
const path = require('path');

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function writeTextIfChanged(filePath, nextContent, { encoding = 'utf8' } = {}) {
  const previous = readIfExists(filePath);
  if (previous === nextContent) {
    return { wrote: false, changed: false, path: filePath };
  }
  ensureDirFor(filePath);
  fs.writeFileSync(filePath, nextContent, { encoding });
  return { wrote: true, changed: true, path: filePath };
}

function writeJsonIfChanged(filePath, value, { spaces = 2, newline = true } = {}) {
  const nextContent = JSON.stringify(value, null, spaces) + (newline ? '\n' : '');
  return writeTextIfChanged(filePath, nextContent);
}

module.exports = {
  ensureDirFor,
  readIfExists,
  writeTextIfChanged,
  writeJsonIfChanged,
};
