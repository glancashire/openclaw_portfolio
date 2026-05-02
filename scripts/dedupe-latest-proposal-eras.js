const fs = require('fs');

const tradesPath = process.argv[2];
if (!tradesPath) {
  console.error('Usage: node scripts/dedupe-latest-proposal-eras.js <trades.md>');
  process.exit(1);
}

const text = fs.readFileSync(tradesPath, 'utf8');
const lines = text.split(/\r?\n/);
const tableRows = lines
  .map((line, index) => ({ line, index }))
  .filter(({ line }) => line.startsWith('| ') && !line.includes('|---|'));

const candidateRows = tableRows
  .map(({ line, index }) => ({
    line,
    index,
    cells: line.split('|').slice(1, -1).map((cell) => cell.trim()),
  }))
  .filter((row) => ['proposed', 'planned'].includes(row.cells[1]) && row.cells[10] === 'pending_user_approval');

if (!candidateRows.length) {
  console.log(JSON.stringify({ changed: false, removed: 0 }, null, 2));
  process.exit(0);
}

const groups = new Map();
for (const row of candidateRows) {
  const date = row.cells[0];
  const signature = row.cells.slice(1, 8).join('|');
  groups.set(date, groups.get(date) || []);
  groups.get(date).push({ ...row, signature });
}

const dates = [...groups.keys()].sort();
const keepDate = dates[dates.length - 1];
const keepSignatures = new Set(groups.get(keepDate).map((row) => row.signature));
const removeIndexes = new Set();

for (const date of dates.slice(0, -1)) {
  for (const row of groups.get(date)) {
    if (keepSignatures.has(row.signature)) removeIndexes.add(row.index);
  }
}

if (!removeIndexes.size) {
  console.log(JSON.stringify({ changed: false, removed: 0, keepDate }, null, 2));
  process.exit(0);
}

const nextLines = lines.filter((_, index) => !removeIndexes.has(index));
fs.writeFileSync(tradesPath, nextLines.join('\n'));
console.log(JSON.stringify({ changed: true, removed: removeIndexes.size, keepDate }, null, 2));
